import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const insertEvent = (data: Prisma.ActivityEventUncheckedCreateInput) =>
  prisma.activityEvent.create({ data });

export const findEventsOfUser = (
  userId: string,
  chapterIds: string[],
  includeGlobal: boolean,
  take: number,
) =>
  prisma.activityEvent.findMany({
    where: {
      userId,
      OR: [
        { chapterId: { in: chapterIds } },
        ...(includeGlobal ? [{ chapterId: null }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
    take,
  });

export const findEventsOfChapter = (chapterId: string, take: number) =>
  prisma.activityEvent.findMany({
    where: { chapterId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
    take,
  });

/** A rider without an account has no history of their own; their hand-overs are kept on the accounts that took them on. */
export const findHandOversOfPassenger = (passengerId: string, take: number) =>
  prisma.activityEvent.findMany({
    where: {
      type: "riderHandedOver",
      AND: [
        { payload: { path: "$.passengerId", equals: passengerId } },
        { payload: { path: "$.direction", equals: "in" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
    take,
  });
