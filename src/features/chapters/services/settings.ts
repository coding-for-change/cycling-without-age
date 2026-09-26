import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const COLUMNS = {
  notifyOnMemberJoined: true,
  applicationAlertPush: true,
  replyToEmail: true,
  welcomeNote: true,
  postRideInstructions: true,
  damageAlertPush: true,
} as const;

export const findChapterSettings = (chapterId: string) =>
  prisma.chapterSettings.findUnique({
    where: { chapterId },
    select: COLUMNS,
  });

export const upsertChapterSettings = (
  chapterId: string,
  data: Omit<Prisma.ChapterSettingsUncheckedCreateInput, "chapterId">,
) =>
  prisma.chapterSettings.upsert({
    where: { chapterId },
    create: { chapterId, ...data },
    update: data,
    select: COLUMNS,
  });
