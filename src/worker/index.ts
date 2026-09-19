import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { chat } from "@/features/chat";
import { notifications } from "@/features/notifications";
import type { EventType } from "@/lib/events/catalog";
import { QUEUE, closeQueues, queue } from "@/lib/events/queues";
import {
  findUnprocessedEvents,
  loadEvent,
  markEventProcessed,
} from "@/lib/events/store";
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
import type { DeliveryJob } from "./deliveries";
import type { Listener } from "./handlers";

const SWEEP_EVERY_MS = 60_000;
const BOARD_PORT = Number(process.env.WORKER_PORT ?? 3001);
const SWEEP_BATCH = 100;
const PRUNE_DEVICES_CRON = "0 4 * * *";
const PRUNE_CHAT_CRON = "0 3 * * *";
const CHAT_RETENTION_MONTHS = 12;
const CHAT_PRUNE_BATCH = 1_000;

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

  console.info(`[worker] sweeping ${stale.length} unprocessed event(s)`);
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
  if (removed > 0) console.info(`[worker] pruned ${removed} stale device(s)`);
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
    console.info(
      `[worker] pruned ${messages} chat message(s) and ${conversations} empty conversation(s)`,
    );
}

const MAINTENANCE: Record<string, () => Promise<void>> = {
  sweep,
  "prune-devices": pruneDevices,
  "prune-chat": pruneChat,
};

const runEmailJob = (job: Job) =>
  job.name === "chat-digest"
    ? parkOnRateLimit(() => deliverChatDigest(job.data as ChatDigestJob))
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
  await queue(QUEUE.events).upsertJobScheduler("prune-chat", {
    pattern: PRUNE_CHAT_CRON,
  });

  const board = await startBoard(BOARD_PORT, () => checkHealth(workers));

  const shutdown = async () => {
    console.info("[worker] shutting down");
    await Promise.all(workers.map((worker) => worker.close()));
    board.close();
    await closeQueues();
    await closeRealtime();
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
