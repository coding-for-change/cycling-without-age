import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const feedSelect = {
  id: true,
  key: true,
  lastFetchedAt: true,
  createdAt: true,
} satisfies Prisma.CalendarFeedSelect;

export type CalendarFeedRow = Prisma.CalendarFeedGetPayload<{
  select: typeof feedSelect;
}>;

export const findFeedOfUser = (userId: string) =>
  prisma.calendarFeed.findUnique({ where: { userId }, select: feedSelect });

export const findFeedByKey = (key: string) =>
  prisma.calendarFeed.findUnique({
    where: { key },
    select: {
      id: true,
      userId: true,
      user: { select: { locale: true, banned: true, banExpires: true } },
    },
  });

export const insertFeed = (userId: string, key: string) =>
  prisma.calendarFeed.create({ data: { userId, key }, select: feedSelect });

export const replaceFeedKey = (userId: string, key: string) =>
  prisma.calendarFeed.upsert({
    where: { userId },
    create: { userId, key },
    update: { key, lastFetchedAt: null },
    select: feedSelect,
  });

export const deleteFeedOfUser = (userId: string) =>
  prisma.calendarFeed.deleteMany({ where: { userId } });

export const touchFeed = (id: string, at: Date, staleBefore: Date) =>
  prisma.calendarFeed.updateMany({
    where: {
      id,
      OR: [{ lastFetchedAt: null }, { lastFetchedAt: { lt: staleBefore } }],
    },
    data: { lastFetchedAt: at },
  });
