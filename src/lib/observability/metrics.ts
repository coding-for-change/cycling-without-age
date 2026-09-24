import { createServer } from "node:http";
import type { Server } from "node:http";
import { getHeapStatistics } from "node:v8";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";
import type {
  CounterConfiguration,
  GaugeConfiguration,
  HistogramConfiguration,
} from "prom-client";
import { reasonOf } from "./errors";
import { logger } from "./logger";

type MetricsGlobal = {
  registry?: Registry;
  server?: Server;
  collectors?: WorkerCollectors;
};

const globalForMetrics = globalThis as unknown as {
  __cwaMetrics?: MetricsGlobal;
};

const store = (globalForMetrics.__cwaMetrics ??= {});

const fresh = store.registry === undefined;

export const registry: Registry = (store.registry ??= new Registry());

if (fresh) collectDefaultMetrics({ register: registry });

const counter = (config: CounterConfiguration<string>) =>
  (registry.getSingleMetric(config.name) as Counter<string> | undefined) ??
  new Counter({ ...config, registers: [registry] });

const gauge = (config: GaugeConfiguration<string>) =>
  (registry.getSingleMetric(config.name) as Gauge<string> | undefined) ??
  new Gauge({ ...config, registers: [registry] });

const histogram = (config: HistogramConfiguration<string>) =>
  (registry.getSingleMetric(config.name) as Histogram<string> | undefined) ??
  new Histogram({ ...config, registers: [registry] });

const JOB_BUCKETS = [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10, 30, 60];
const DELIVERY_BUCKETS = [1, 5, 15, 30, 60, 120, 300, 600, 1800];

export const web = {
  domainEvents: counter({
    name: "cwa_domain_events_total",
    help: "Domain events written to the outbox",
    labelNames: ["type"],
  }),
  outboxEnqueueFailures: counter({
    name: "cwa_outbox_enqueue_failures_total",
    help: "Outbox events that could not be enqueued and were left to the sweeper",
  }),
  sseConnections: gauge({
    name: "cwa_sse_connections",
    help: "Open server-sent-event streams",
  }),
  sseReconnects: counter({
    name: "cwa_sse_reconnects_total",
    help: "Server-sent-event streams resumed with a Last-Event-ID",
  }),
  rateLimitHits: counter({
    name: "cwa_rate_limit_hits_total",
    help: "Requests rejected by a rate limit",
    labelNames: ["scope"],
  }),
  authEvents: counter({
    name: "cwa_auth_events_total",
    help: "Authentication events by kind and outcome",
    labelNames: ["kind", "outcome"],
  }),
  realtimeErrors: counter({
    name: "cwa_realtime_errors_total",
    help: "Realtime hub and presence errors by site",
    labelNames: ["site"],
  }),
  calendarFeedPolls: counter({
    name: "cwa_calendar_feed_polls_total",
    help: "Calendar feed requests by outcome",
    labelNames: ["outcome"],
  }),
};

export const worker = {
  jobs: counter({
    name: "cwa_jobs_total",
    help: "Processed jobs by queue, name and outcome",
    labelNames: ["queue", "name", "outcome"],
  }),
  jobDuration: histogram({
    name: "cwa_job_duration_seconds",
    help: "Job processing duration",
    labelNames: ["queue", "name"],
    buckets: JOB_BUCKETS,
  }),
  queueJobs: gauge({
    name: "cwa_queue_jobs",
    help: "Jobs per queue and state",
    labelNames: ["queue", "state"],
    collect: () => collectQueueJobs(),
  }),
  queueOldestWaitingAge: gauge({
    name: "cwa_queue_oldest_waiting_age_seconds",
    help: "Age of the oldest waiting job per queue",
    labelNames: ["queue"],
    collect: () => collectOldestWaiting(),
  }),
  deliveries: counter({
    name: "cwa_deliveries_total",
    help: "Notification deliveries by channel, status and reason",
    labelNames: ["channel", "status", "reason"],
  }),
  deliveryLatency: histogram({
    name: "cwa_delivery_latency_seconds",
    help: "Seconds between the domain event and its delivery",
    labelNames: ["channel"],
    buckets: DELIVERY_BUCKETS,
  }),
  mailRateLimited: counter({
    name: "cwa_mail_rate_limited_total",
    help: "Mail jobs parked because the provider rate-limited us",
  }),
  pushTokensInvalid: counter({
    name: "cwa_push_tokens_invalid_total",
    help: "Device tokens rejected as invalid",
  }),
  pushSendErrors: counter({
    name: "cwa_push_send_errors_total",
    help: "Push send errors by code",
    labelNames: ["code"],
  }),
  outboxUnprocessed: gauge({
    name: "cwa_outbox_unprocessed_events",
    help: "Outbox events that are still unprocessed",
    collect: () => collectOutboxCount(),
  }),
  outboxOldestUnprocessedAge: gauge({
    name: "cwa_outbox_oldest_unprocessed_age_seconds",
    help: "Age of the oldest unprocessed outbox event",
    collect: () => collectOutboxAge(),
  }),
  sweepRequeued: counter({
    name: "cwa_sweep_requeued_total",
    help: "Unprocessed outbox events requeued by the sweeper",
  }),
  cronRuns: counter({
    name: "cwa_cron_runs_total",
    help: "Maintenance runs by job and outcome",
    labelNames: ["cron", "outcome"],
  }),
  cronLastSuccess: gauge({
    name: "cwa_cron_last_success_timestamp_seconds",
    help: "Unix timestamp of the last successful maintenance run",
    labelNames: ["cron"],
  }),
  up: gauge({
    name: "cwa_worker_up",
    help: "Whether the BullMQ worker for a queue is running",
    labelNames: ["queue"],
    collect: () => collectWorkerUp(),
  }),
};

export const runtime = {
  heapSizeLimit: gauge({
    name: "cwa_nodejs_heap_size_limit_bytes",
    help: "V8 heap size limit",
    collect() {
      runtime.heapSizeLimit.set(getHeapStatistics().heap_size_limit);
    },
  }),
};

export type QueueJobState =
  "waiting" | "active" | "delayed" | "failed" | "completed";

export type QueueSnapshot = {
  name: string;
  getJobCounts: (...states: QueueJobState[]) => Promise<Record<string, number>>;
  getWaiting: (
    start?: number,
    end?: number,
  ) => Promise<Array<{ timestamp: number } | undefined>>;
};

export type WorkerSnapshot = { name: string; isRunning: () => boolean };

export type UnprocessedEvents = () => Promise<{
  count: number;
  oldestCreatedAt: Date | null;
}>;

export type WorkerCollectors = {
  queues: QueueSnapshot[];
  workers: WorkerSnapshot[];
  countUnprocessed: UnprocessedEvents;
};

const QUEUE_STATES: QueueJobState[] = [
  "waiting",
  "active",
  "delayed",
  "failed",
  "completed",
];

const ageSeconds = (since: number) => Math.max(0, (Date.now() - since) / 1_000);

async function guard(site: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    logger.warn({ site, reason: reasonOf(error) }, "metrics collect failed");
  }
}

async function collectQueueJobs() {
  const collectors = store.collectors;
  if (!collectors) return;

  await guard("queue_jobs", async () => {
    for (const queue of collectors.queues) {
      const counts = await queue.getJobCounts(...QUEUE_STATES);
      for (const state of QUEUE_STATES)
        worker.queueJobs.set({ queue: queue.name, state }, counts[state] ?? 0);
    }
  });
}

async function collectOldestWaiting() {
  const collectors = store.collectors;
  if (!collectors) return;

  await guard("queue_oldest_waiting", async () => {
    for (const queue of collectors.queues) {
      const [oldest] = await queue.getWaiting(0, 0);
      worker.queueOldestWaitingAge.set(
        { queue: queue.name },
        oldest ? ageSeconds(oldest.timestamp) : 0,
      );
    }
  });
}

function collectWorkerUp() {
  const collectors = store.collectors;
  if (!collectors) return;

  for (const running of collectors.workers)
    worker.up.set({ queue: running.name }, running.isRunning() ? 1 : 0);
}

// prom-client snapshots every metric in one batch, so both outbox gauges sample
// on their own and share the single query that is already in flight.
let outboxSample: ReturnType<UnprocessedEvents> | null = null;

function sampleOutbox() {
  const collectors = store.collectors;
  if (!collectors) return null;
  if (!outboxSample) {
    outboxSample = collectors.countUnprocessed();
    outboxSample
      .finally(() => {
        outboxSample = null;
      })
      .catch(() => {});
  }
  return outboxSample;
}

async function collectOutboxCount() {
  const sample = sampleOutbox();
  if (!sample) return;

  await guard("outbox_count", async () => {
    worker.outboxUnprocessed.set((await sample).count);
  });
}

async function collectOutboxAge() {
  const sample = sampleOutbox();
  if (!sample) return;

  await guard("outbox_age", async () => {
    const { oldestCreatedAt } = await sample;
    worker.outboxOldestUnprocessedAge.set(
      oldestCreatedAt ? ageSeconds(oldestCreatedAt.getTime()) : 0,
    );
  });
}

export function registerWorkerCollectors(collectors: WorkerCollectors) {
  store.collectors = collectors;
  for (const channel of ["email", "push"]) {
    worker.deliveryLatency.zero({ channel });
  }
}

export function startMetricsServer(port: number): Server {
  if (store.server) return store.server;

  const server = createServer((request, response) => {
    const path = (request.url ?? "").split("?")[0];
    if (request.method !== "GET" || path !== "/metrics") {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("not found");
      return;
    }

    registry
      .metrics()
      .then((body) => {
        response.writeHead(200, { "Content-Type": registry.contentType });
        response.end(body);
      })
      .catch((error) => {
        logger.error({ reason: reasonOf(error) }, "metrics scrape failed");
        response.writeHead(500, { "Content-Type": "text/plain" });
        response.end("metrics unavailable");
      });
  });

  server.on("error", (error) => {
    logger.warn(
      { port, reason: reasonOf(error) },
      "metrics server unavailable",
    );
    store.server = undefined;
  });

  store.server = server;
  server.listen(port);
  return server;
}

export function stopMetricsServer(): Promise<void> {
  const server = store.server;
  if (!server) return Promise.resolve();
  store.server = undefined;
  return new Promise((resolve) => server.close(() => resolve()));
}
