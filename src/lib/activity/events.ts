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

/** A hand-over writes a line for each manager; a shared history shows one. */
const ONCE_PER_HAND_OVER: Prisma.ActivityEventWhereInput = {
  NOT: {
    type: "riderHandedOver",
    payload: { path: "$.direction", equals: "in" },
  },
};

export const findEventsOfChapter = (chapterId: string, take: number) =>
  prisma.activityEvent.findMany({
    where: { chapterId, ...ONCE_PER_HAND_OVER },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
    take,
  });

export const findEventsOfChapters = (chapterIds: string[], take: number) =>
  prisma.activityEvent.findMany({
    where: { chapterId: { in: chapterIds }, ...ONCE_PER_HAND_OVER },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
    take,
  });

export const insertEvents = (data: Prisma.ActivityEventCreateManyInput[]) =>
  prisma.activityEvent.createMany({ data });

export const findEventsOfPassenger = (passengerId: string, take: number) =>
  prisma.activityEvent.findMany({
    where: { passengerId, ...ONCE_PER_HAND_OVER },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
    take,
  });
