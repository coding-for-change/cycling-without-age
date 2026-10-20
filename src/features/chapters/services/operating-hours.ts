import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const windowSelect = {
  weekday: true,
  startMinute: true,
  endMinute: true,
} satisfies Prisma.ChapterOperatingWindowSelect;

const closureSelect = {
  id: true,
  date: true,
  reason: true,
} satisfies Prisma.ChapterClosureSelect;

export const findOperatingWindows = (chapterIds: string[]) =>
  prisma.chapterOperatingWindow.findMany({
    where: { chapterId: { in: chapterIds } },
    orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
    select: { chapterId: true, ...windowSelect },
  });

export const replaceOperatingWindows = (
  chapterId: string,
  windows: { weekday: number; startMinute: number; endMinute: number }[],
) =>
  prisma.$transaction([
    prisma.chapterOperatingWindow.deleteMany({ where: { chapterId } }),
    prisma.chapterOperatingWindow.createMany({
      data: windows.map((window) => ({ chapterId, ...window })),
    }),
  ]);

export const findClosures = (chapterIds: string[], from: Date) =>
  prisma.chapterClosure.findMany({
    where: { chapterId: { in: chapterIds }, date: { gte: from } },
    orderBy: { date: "asc" },
    select: { chapterId: true, ...closureSelect },
  });

export const upsertClosure = (
  chapterId: string,
  date: Date,
  reason: string | null,
) =>
  prisma.chapterClosure.upsert({
    where: { chapterId_date: { chapterId, date } },
    create: { chapterId, date, reason },
    update: { reason },
    select: closureSelect,
  });

export const deleteClosure = (chapterId: string, id: string) =>
  prisma.chapterClosure.deleteMany({ where: { id, chapterId } });
