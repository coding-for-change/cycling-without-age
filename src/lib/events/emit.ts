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

const ENQUEUE_TIMEOUT_MS = 2_000;

/**
 * Fast path only. A dead Redis must not fail a request that already committed:
 * the sweeper re-enqueues anything still unprocessed a minute later.
 *
 * The timeout is what makes that true. ioredis runs with
 * `maxRetriesPerRequest: null`, so an unreachable Redis parks the command
 * forever instead of rejecting it, and the request would hang after the commit.
 */
export async function dispatch(eventIds: string[]) {
  if (eventIds.length === 0) return;

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

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`no answer within ${ms}ms`)),
      ms,
    );
    Promise.resolve(promise).then(
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
