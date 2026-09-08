import type { Worker } from "bullmq";
import { QUEUE, queue } from "@/lib/events/queues";

const PING_TIMEOUT_MS = 2_000;

export type Health = { ok: true } | { ok: false; reason: string };

type Options = {
  ping?: () => Promise<unknown>;
  timeoutMs?: number;
};

/**
 * Unhealthy when a worker has stopped or Redis does not answer. The probe is a
 * queue count: one round trip through BullMQ's own API. It needs its own
 * timeout because with `maxRetriesPerRequest: null` ioredis parks commands
 * until it reconnects, so a dead Redis would hang the probe instead of failing it.
 */
export async function checkHealth(
  workers: Pick<Worker, "name" | "isRunning">[],
  { ping = pingRedis, timeoutMs = PING_TIMEOUT_MS }: Options = {},
): Promise<Health> {
  const stopped = workers.filter((w) => !w.isRunning()).map((w) => w.name);
  if (stopped.length > 0) {
    return { ok: false, reason: `workers stopped: ${stopped.join(", ")}` };
  }

  try {
    await withTimeout(ping(), timeoutMs);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `redis: ${message}` };
  }
}

const pingRedis = () => queue(QUEUE.events).count();

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`no answer within ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
