import { logDomainEvent, logger } from "@/lib/observability/logger";
import { reasonOf } from "@/lib/observability/errors";
import { web } from "@/lib/observability/metrics";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import type { DomainEvent } from "./catalog";
import { insertEvent, scopeOf } from "./store";
import { withTimeout } from "@/lib/with-timeout";

type Emit = (event: DomainEvent) => Promise<void>;

type EmittedEvent = {
  id: string;
  type: DomainEvent["type"];
  chapterId: string | null;
  actorUserId: string | null;
};

export async function transaction<T>(
  fn: (tx: Prisma.TransactionClient, emit: Emit) => Promise<T>,
): Promise<T> {
  const emitted: EmittedEvent[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const emit: Emit = async (event) => {
      const { id } = await insertEvent(event, tx);
      emitted.push({ id, type: event.type, ...scopeOf(event) });
    };
    return fn(tx, emit);
  });

  for (const event of emitted) {
    logDomainEvent(event);
    web.domainEvents.inc({ type: event.type });
  }

  await dispatch(emitted.map((event) => event.id));
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
      web.outboxEnqueueFailures.inc();
      logger.error(
        { reason: reasonOf(result.reason) },
        "outbox enqueue failed, left to the sweeper",
      );
    }
  }
}
