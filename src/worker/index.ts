import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { notifications } from "@/features/notifications";
import type { EventType } from "@/lib/events/catalog";
import { QUEUE, closeQueues, queue } from "@/lib/events/queues";
import {
  findUnprocessedEvents,
  loadEvent,
  markEventProcessed,
} from "@/lib/events/store";
import { redisConnection } from "@/lib/redis";
import { startBoard } from "./board";
import { runEmailDelivery, runPushDelivery } from "./deliveries";
import { handlers } from "./handlers";
import { checkHealth } from "./health";
import type { Listener } from "./handlers";

const SWEEP_EVERY_MS = 60_000;
const BOARD_PORT = Number(process.env.WORKER_PORT ?? 3001);
const SWEEP_BATCH = 100;
// Once a night, off-peak for every chapter between Japan and the US west coast.
const PRUNE_DEVICES_CRON = "0 4 * * *";

const RESEND_RATE_LIMIT = Number(process.env.RESEND_RATE_LIMIT ?? 8);

/**
 * One event in, one job per listener out. The jobId pins each (event, listener)
 * pair, so re-dispatching the same event is free. It may not contain a colon:
 * BullMQ builds its Redis keys as `bull:<queue>:<jobId>`.
 */
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

/**
 * The safety net for everything Redis never heard about: an enqueue that failed,
 * a Redis that was down, a process that died between commit and add.
 */
async function sweep() {
  const stale = await findUnprocessedEvents(
    new Date(Date.now() - SWEEP_EVERY_MS),
    SWEEP_BATCH,
  );
  if (stale.length === 0) return;

  console.info(`[worker] sweeping ${stale.length} unprocessed event(s)`);
  await queue(QUEUE.events).addBulk(
    stale.map(({ id }) => ({
      name: "dispatch",
      data: { id },
      opts: { jobId: id },
    })),
  );
}

/** The nightly half of token hygiene; the other half is FCM rejecting a token mid-send. */
async function pruneDevices() {
  const removed = await notifications.pruneStaleDevices();
  if (removed > 0) console.info(`[worker] pruned ${removed} stale device(s)`);
}

const MAINTENANCE: Record<string, () => Promise<void>> = {
  sweep,
  "prune-devices": pruneDevices,
};

async function runListener(job: Job<{ eventId: string }>) {
  const event = await loadEvent(job.data.eventId);
  const listener = handlers[event.type][job.name] as
    Listener<EventType> | undefined;
  if (!listener) throw new Error(`[worker] no listener ${job.name}`);
  await listener({ id: job.data.eventId, event });
}

async function main() {
  const workers = [
    new Worker<{ id: string }>(
      QUEUE.events,
      (job) => MAINTENANCE[job.name]?.() ?? dispatchEvent(job.data.id),
      { connection: redisConnection },
    ),
    new Worker(QUEUE.handlers, runListener, {
      connection: redisConnection,
      concurrency: 10,
    }),
    new Worker(QUEUE.email, runEmailDelivery, {
      connection: redisConnection,
      limiter: { max: RESEND_RATE_LIMIT, duration: 1_000 },
      concurrency: RESEND_RATE_LIMIT,
    }),
    new Worker(QUEUE.push, runPushDelivery, {
      connection: redisConnection,
      concurrency: 5,
    }),
  ];

  for (const worker of workers) {
    worker.on("failed", (job, error) =>
      console.error(
        `[worker] ${worker.name}/${job?.name} attempt ${job?.attemptsMade} failed`,
        error,
      ),
    );
  }

  await queue(QUEUE.events).upsertJobScheduler("sweep", {
    every: SWEEP_EVERY_MS,
  });
  await queue(QUEUE.events).upsertJobScheduler("prune-devices", {
    pattern: PRUNE_DEVICES_CRON,
  });

  const board = await startBoard(BOARD_PORT, () => checkHealth(workers));

  const shutdown = async () => {
    console.info("[worker] shutting down");
    await Promise.all(workers.map((worker) => worker.close()));
    board.close();
    await closeQueues();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.info(`[worker] listening on ${Object.values(QUEUE).join(", ")}`);
  console.info(
    `[worker] queues dashboard: http://localhost:${BOARD_PORT}/queues`,
  );
}

main().catch((error) => {
  console.error("[worker] failed to start", error);
  process.exit(1);
});
