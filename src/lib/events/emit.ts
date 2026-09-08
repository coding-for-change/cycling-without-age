import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import type { DomainEvent } from "./catalog";
import { QUEUE, queue } from "./queues";
import { insertEvent } from "./store";

type Emit = (event: DomainEvent) => Promise<void>;

/**
 * The transactional outbox. The business write and the `Event` row commit
 * together or not at all, so a crash can lose the job but never the fact that
 * something happened. Enqueueing deliberately happens *after* the commit —
 * inside it we would be announcing a change that may still roll back.
 */
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

/**
 * Fast path only. A dead Redis must not fail a request that already committed:
 * the sweeper re-enqueues anything still unprocessed a minute later.
 */
export async function dispatch(eventIds: string[]) {
  if (eventIds.length === 0) return;

  const enqueued = await Promise.allSettled(
    eventIds.map((id) =>
      queue(QUEUE.events).add("dispatch", { id }, { jobId: id }),
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
