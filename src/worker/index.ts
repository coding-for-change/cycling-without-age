import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { captureException, flush } from "@sentry/node";
import { chat } from "@/features/chat";
import { notifications } from "@/features/notifications";
import type { EventType } from "@/lib/events/catalog";
import { QUEUE, closeQueues, queue } from "@/lib/events/queues";
import {
  countUnprocessed,
  findUnprocessedEvents,
  loadEvent,
  markEventProcessed,
} from "@/lib/events/store";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import {
  registerWorkerCollectors,
  startMetricsServer,
  stopMetricsServer,
  worker as workerMetrics,
} from "@/lib/observability/metrics";
import { closeRealtime } from "@/lib/realtime";
import { redisConnection } from "@/lib/redis";
import { deliverChatDigest } from "@/use-cases/chat-notifications/deliver-chat-digest";
import type { ChatDigestJob } from "@/use-cases/chat-notifications/deliver-chat-digest";
import { deliverChatPush } from "@/use-cases/chat-notifications/deliver-chat-push";
import type { ChatPushJob } from "@/use-cases/chat-notifications/deliver-chat-push";
import { startBoard } from "./board";
import {
  parkOnRateLimit,
  runEmailDelivery,
  runPushDelivery,
} from "./deliveries";
import { handlers } from "./handlers";
import { checkHealth } from "./health";
import {
  MAINTENANCE_NAMES,
  isMaintenance,
  runMaintenance,
  schedulerOptions,
} from "./monitors";
import type { MaintenanceName } from "./monitors";
import type { DeliveryJob } from "./deliveries";
import type { Listener } from "./handlers";

const SWEEP_EVERY_MS = 60_000;
const BOARD_PORT = Number(process.env.WORKER_PORT ?? 3001);
const METRICS_PORT = Number(process.env.METRICS_PORT ?? 9464);
const SWEEP_BATCH = 100;
const CHAT_RETENTION_MONTHS = 12;
const CHAT_PRUNE_BATCH = 1_000;
const WORKER_ERROR_EVERY_MS = 60_000;
const HARD_EXIT_MS = 25_000;
const FLUSH_MS = 2_000;

const RESEND_RATE_LIMIT = Number(process.env.RESEND_RATE_LIMIT ?? 8);

// A jobId may not contain a colon: BullMQ keys are `bull:<queue>:<jobId>`.
async function dispatchEvent(eventId: string) {
  const event = await loadEvent(eventId);
  const listeners = Object.keys(handlers[event.type]);

  await queue(QUEUE.handlers).addBulk(
    listeners.map((name) => ({
      name,
      data: { eventId },
      opts: { jobId: `${eventId}-${name}` },
    })),
  );
  await markEventProcessed(eventId);
}

async function sweep() {
  const stale = await findUnprocessedEvents(
    new Date(Date.now() - SWEEP_EVERY_MS),
    SWEEP_BATCH,
  );
  if (stale.length === 0) return;

  logger.info({ count: stale.length }, "sweeping unprocessed events");
  workerMetrics.sweepRequeued.inc(stale.length);
  await queue(QUEUE.events).addBulk(
    stale.map(({ id }) => ({
      name: "dispatch",
      data: { id },
      opts: { jobId: id },
    })),
  );
}

async function pruneDevices() {
  const removed = await notifications.pruneStaleDevices();
  if (removed > 0) logger.info({ removed }, "pruned stale devices");
}

async function pruneChat() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - CHAT_RETENTION_MONTHS);
  const olderThan = cutoff.toISOString();

  let messages = 0;
  for (;;) {
    const removed = await chat.pruneOldMessages(olderThan, CHAT_PRUNE_BATCH);
    if (removed === 0) break;
    messages += removed;
  }

  const conversations = await chat.purgeEmptyConversations();
  if (messages > 0 || conversations > 0)
    logger.info({ messages, conversations }, "pruned chat history");
}

const MAINTENANCE: Record<MaintenanceName, () => Promise<void>> = {
  sweep,
  "prune-devices": pruneDevices,
  "prune-chat": pruneChat,
};

const runEventJob = (job: Job<{ id: string }>) =>
  isMaintenance(job.name)
    ? runMaintenance(job.name, MAINTENANCE[job.name])
    : dispatchEvent(job.data.id);

const runEmailJob = (job: Job) =>
  job.name === "chat-digest"
    ? parkOnRateLimit(job.name, async () => {
        await deliverChatDigest(job.data as ChatDigestJob);
      })
    : runEmailDelivery(job as DeliveryJob);

const runPushJob = (job: Job) =>
  job.name === "chat"
    ? deliverChatPush(job.data as ChatPushJob)
    : runPushDelivery(job as DeliveryJob);

async function runListener(job: Job<{ eventId: string }>) {
  const event = await loadEvent(job.data.eventId);
  const listener = handlers[event.type][job.name] as
    Listener<EventType> | undefined;
  if (!listener) throw new Error(`[worker] no listener ${job.name}`);
  await listener({ id: job.data.eventId, event });
}

const lastWorkerError = new Map<string, number>();

function captureWorkerError(queueName: string, error: unknown) {
  const now = Date.now();
  if (now - (lastWorkerError.get(queueName) ?? 0) < WORKER_ERROR_EVERY_MS)
    return;
  lastWorkerError.set(queueName, now);
  captureException(error);
}

async function main() {
  const workers = [
    new Worker<{ id: string }>(QUEUE.events, runEventJob, {
      connection: redisConnection,
    }),
    new Worker<{ eventId: string }>(QUEUE.handlers, runListener, {
      connection: redisConnection,
      concurrency: 10,
    }),
    new Worker(QUEUE.email, runEmailJob, {
      connection: redisConnection,
      limiter: { max: RESEND_RATE_LIMIT, duration: 1_000 },
      concurrency: RESEND_RATE_LIMIT,
    }),
    new Worker(QUEUE.push, runPushJob, {
      connection: redisConnection,
      concurrency: 5,
    }),
  ];

  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      logger.error(
        {
          queue: worker.name,
          job: job?.name,
          job_id: job?.id,
          attempt: job?.attemptsMade,
          err: serializeError(error),
        },
        "job failed",
      );
      workerMetrics.jobs.inc({
        queue: worker.name,
        name: job?.name ?? "unknown",
        outcome: "failed",
      });
      if (job && job.attemptsMade >= (job.opts.attempts ?? 1))
        captureException(error, {
          tags: { queue: worker.name, job: job.name },
        });
    });

    worker.on("completed", (job) => {
      workerMetrics.jobs.inc({
        queue: worker.name,
        name: job.name,
        outcome: "completed",
      });
      if (job.finishedOn && job.processedOn)
        workerMetrics.jobDuration.observe(
          { queue: worker.name, name: job.name },
          (job.finishedOn - job.processedOn) / 1_000,
        );
    });

    worker.on("error", (error) => {
      logger.error(
        { queue: worker.name, err: serializeError(error) },
        "worker error",
      );
      captureWorkerError(worker.name, error);
    });

    worker.on("stalled", (jobId) => {
      logger.warn({ queue: worker.name, job_id: jobId }, "job stalled");
    });
  }

  for (const name of MAINTENANCE_NAMES)
    await queue(QUEUE.events).upsertJobScheduler(name, schedulerOptions(name));

  const board = await startBoard(BOARD_PORT, () => checkHealth(workers));
  startMetricsServer(METRICS_PORT);
  registerWorkerCollectors({
    queues: Object.values(QUEUE).map((name) => queue(name)),
    workers,
    countUnprocessed,
  });

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    logger.info("worker shutting down");

    const hardExit = setTimeout(() => {
      logger.error({ after_ms: HARD_EXIT_MS }, "worker shutdown timed out");
      process.exit(1);
    }, HARD_EXIT_MS);
    hardExit.unref();

    await Promise.allSettled(workers.map((worker) => worker.close()));
    board.close();
    await stopMetricsServer();
    await closeQueues();
    await closeRealtime();
    await flush(FLUSH_MS);
    logger.info("worker stopped");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: serializeError(reason) }, "unhandled rejection");
  });
  process.on("uncaughtException", (error) => {
    logger.fatal({ err: serializeError(error) }, "uncaught exception");
  });

  logger.info(
    {
      queues: Object.values(QUEUE),
      board_port: BOARD_PORT,
      metrics_port: METRICS_PORT,
    },
    "worker listening",
  );
}

main().catch((error) => {
  logger.fatal({ err: serializeError(error) }, "worker failed to start");
  captureException(error);
  void flush(FLUSH_MS).finally(() => process.exit(1));
});
