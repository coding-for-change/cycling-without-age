import { prisma } from "@/lib/prisma";
import type { ApplicationStatus } from "@/generated/prisma";

export const upsertPilotApplication = (
  userId: string,
  chapterId: string,
  message?: string,
) =>
  prisma.chapterApplication.upsert({
    where: { userId_chapterId: { userId, chapterId } },
    create: { userId, chapterId, message, role: "pilot", status: "pending" },
    update: {
      message,
      status: "pending",
      decidedByUserId: null,
      decidedAt: null,
    },
  });

export const findApplicationById = (id: string) =>
  prisma.chapterApplication.findUnique({ where: { id } });

export const findApplicationsOfChapter = (
  chapterId: string,
  status?: ApplicationStatus,
) =>
  prisma.chapterApplication.findMany({
    where: { chapterId, status },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true, image: true } } },
  });

export const findApplicationsOfUser = (userId: string) =>
  prisma.chapterApplication.findMany({ where: { userId } });

export const setApplicationDecision = (
  id: string,
  status: Exclude<ApplicationStatus, "pending">,
  decidedByUserId: string,
) =>
  prisma.chapterApplication.updateMany({
    where: { id, status: "pending" },
    data: { status, decidedByUserId, decidedAt: new Date() },
  });
