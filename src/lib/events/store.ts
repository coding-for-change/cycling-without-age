import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { eventSchema } from "./catalog";
import type { DomainEvent } from "./catalog";

const scopeOf = (event: DomainEvent) => ({
  actorUserId: "actorUserId" in event ? event.actorUserId : null,
  chapterId: "chapterId" in event ? event.chapterId : null,
});

export const insertEvent = (
  event: DomainEvent,
  db: Prisma.TransactionClient = prisma,
) =>
  db.event.create({
    data: {
      type: event.type,
      payload: event as unknown as Prisma.InputJsonObject,
      ...scopeOf(event),
    },
    select: { id: true },
  });

export const loadEvent = async (id: string) => {
  const row = await prisma.event.findUniqueOrThrow({ where: { id } });
  return eventSchema.parse(row.payload);
};

export const findUnprocessedEvents = (before: Date, take: number) =>
  prisma.event.findMany({
    where: { processedAt: null, createdAt: { lt: before } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
    take,
  });

export const markEventProcessed = (id: string) =>
  prisma.event.update({
    where: { id },
    data: { processedAt: new Date() },
    select: { id: true },
  });
