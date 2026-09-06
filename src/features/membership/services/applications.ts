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
      decisionNote: null,
      approvalSeenAt: null,
    },
  });

export const findApplicationById = (id: string) =>
  prisma.chapterApplication.findUnique({ where: { id } });

export const findApplicationsOfChapters = (
  chapterIds: string[],
  status?: ApplicationStatus,
) =>
  prisma.chapterApplication.findMany({
    where: { chapterId: { in: chapterIds }, status },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
          phoneNumber: true,
        },
      },
      chapter: { select: { name: true, slug: true } },
    },
  });

export const findApplicationsOfUser = (userId: string) =>
  prisma.chapterApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { chapter: { select: { name: true, slug: true } } },
  });

export const setApplicationDecision = (
  id: string,
  status: Exclude<ApplicationStatus, "pending">,
  decidedByUserId: string,
  note?: string,
) =>
  prisma.chapterApplication.updateMany({
    where: { id, status: "pending" },
    data: {
      status,
      decidedByUserId,
      decidedAt: new Date(),
      decisionNote: note ?? null,
    },
  });

export const markApprovalsSeen = (userId: string) =>
  prisma.chapterApplication.updateMany({
    where: { userId, status: "approved", approvalSeenAt: null },
    data: { approvalSeenAt: new Date() },
  });
