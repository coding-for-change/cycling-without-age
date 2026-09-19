import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import type { DomainEvent } from "./catalog";
import { insertEvent } from "./store";
import { withTimeout } from "@/lib/with-timeout";

type Emit = (event: DomainEvent) => Promise<void>;

export async function transaction<T>(
  fn: (tx: Prisma.TransactionClient, emit: Emit) => Promise<T>,
): Promise<T> {
  const emitted: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const emit: Emit = async (event) => {
      const { id } = await insertEvent(event, tx);
      emitted.push(id);
    };
    return fn(tx, emit);
  });

  await dispatch(emitted);
  return result;
}

const ENQUEUE_TIMEOUT_MS = 2_000;

// With `maxRetriesPerRequest: null` an unreachable Redis parks the command
// forever; the timeout is what lets a committed request return.
export async function dispatch(eventIds: string[]) {
  if (eventIds.length === 0) return;
  const { QUEUE, queue } = await import("./queues");

  const enqueued = await Promise.allSettled(
    eventIds.map((id) =>
      withTimeout(
        queue(QUEUE.events).add("dispatch", { id }, { jobId: id }),
        ENQUEUE_TIMEOUT_MS,
      ),
    ),
  );

  for (const result of enqueued) {
    if (result.status === "rejected") {
      console.error(
        "[events] enqueue failed, left to the sweeper",
        result.reason,
      );
    }
  }
}
