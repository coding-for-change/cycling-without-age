import type { Worker } from "bullmq";
import { QUEUE, queue } from "@/lib/events/queues";
import { withTimeout } from "@/lib/with-timeout";

const PING_TIMEOUT_MS = 2_000;

export type Health = { ok: true } | { ok: false; reason: string };

type Options = {
  ping?: () => Promise<unknown>;
  timeoutMs?: number;
};

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
