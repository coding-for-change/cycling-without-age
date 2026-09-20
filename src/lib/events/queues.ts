import { Queue } from "bullmq";
import { redisConnection } from "@/lib/redis";

// Email and push are separate queues so the Resend rate limit throttles mail
// without ever holding a push job back.
export const QUEUE = {
  events: "events",
  handlers: "handlers",
  email: "email",
  push: "push",
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

const globalForQueues = globalThis as unknown as {
  queues: Map<QueueName, Queue> | undefined;
};

const queues = globalForQueues.queues ?? new Map<QueueName, Queue>();

if (process.env.NODE_ENV !== "production") globalForQueues.queues = queues;

export function queue(name: QueueName) {
  const cached = queues.get(name);
  if (cached) return cached;

  const created = new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
    },
  });
  queues.set(name, created);
  return created;
}

export const closeQueues = async () => {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
};
