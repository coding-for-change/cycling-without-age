import { prisma } from "@/lib/prisma";
import type { $Enums, Prisma } from "@/generated/prisma";

const membershipSelect = {
  id: true,
  storageLocationId: true,
  chapterId: true,
  status: true,
  requestedByUserId: true,
  decidedAt: true,
  decisionNote: true,
  storageLocation: {
    select: { id: true, name: true, countryId: true, kind: true },
  },
  chapter: { select: { id: true, name: true, countryId: true } },
} satisfies Prisma.StorageLocationChapterSelect;

export type PoolMembershipRow = Prisma.StorageLocationChapterGetPayload<{
  select: typeof membershipSelect;
}>;

export const findMembership = (storageLocationId: string, chapterId: string) =>
  prisma.storageLocationChapter.findUnique({
    where: { storageLocationId_chapterId: { storageLocationId, chapterId } },
    select: membershipSelect,
  });

export const findMembershipById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.storageLocationChapter.findUnique({
    where: { id },
    select: membershipSelect,
  });

export const findMembershipsOfChapters = (chapterIds: string[]) =>
  prisma.storageLocationChapter.findMany({
    where: { chapterId: { in: chapterIds } },
    orderBy: { createdAt: "desc" },
    select: membershipSelect,
  });

export const upsertMembershipRequest = (
  storageLocationId: string,
  chapterId: string,
  requestedByUserId: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.storageLocationChapter.upsert({
    where: { storageLocationId_chapterId: { storageLocationId, chapterId } },
    create: { storageLocationId, chapterId, requestedByUserId },
    update: {
      status: "pending",
      requestedByUserId,
      decidedByUserId: null,
      decidedAt: null,
      decisionNote: null,
    },
    select: membershipSelect,
  });

export const setMembershipDecision = (
  id: string,
  status: $Enums.ApplicationStatus,
  decidedByUserId: string,
  decisionNote: string | null,
  db: Prisma.TransactionClient = prisma,
) =>
  db.storageLocationChapter.updateMany({
    where: { id, status: "pending" },
    data: { status, decidedByUserId, decidedAt: new Date(), decisionNote },
  });

export const deleteMembership = (
  storageLocationId: string,
  chapterId: string,
) =>
  prisma.storageLocationChapter.deleteMany({
    where: { storageLocationId, chapterId },
  });
