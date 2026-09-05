import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const insertEvent = (data: Prisma.ActivityEventUncheckedCreateInput) =>
  prisma.activityEvent.create({ data });

export const findEventsOfUser = (
  userId: string,
  chapterIds: string[],
  includeGlobal: boolean,
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
    include: { actor: { select: { name: true } } },
  });
