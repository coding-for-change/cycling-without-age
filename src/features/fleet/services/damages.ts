import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { reachableLocationWhere } from "./locations";

const person = { select: { id: true, name: true } } as const;

export const damageSelect = {
  id: true,
  trishawId: true,
  rideId: true,
  description: true,
  photoFileId: true,
  grounding: true,
  reportedAt: true,
  clearedAt: true,
  clearNote: true,
  reportedBy: person,
  clearedBy: person,
} satisfies Prisma.TrishawDamageSelect;

export type DamageRow = Prisma.TrishawDamageGetPayload<{
  select: typeof damageSelect;
}>;

export const insertDamage = (
  data: Prisma.TrishawDamageUncheckedCreateInput,
  db: Prisma.TransactionClient,
) => db.trishawDamage.create({ data, select: damageSelect });

export const findDamageById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.trishawDamage.findUnique({ where: { id }, select: damageSelect });

export const clearDamageById = (
  id: string,
  clearedByUserId: string,
  clearNote: string,
  db: Prisma.TransactionClient,
) =>
  db.trishawDamage.updateMany({
    where: { id, clearedAt: null },
    data: { clearedAt: new Date(), clearedByUserId, clearNote },
  });

export const countOpenGroundingDamages = (
  trishawId: string,
  db: Prisma.TransactionClient,
) =>
  db.trishawDamage.count({
    where: { trishawId, clearedAt: null, grounding: true },
  });

export const findDamagesOfTrishaw = (trishawId: string, take = 100) =>
  prisma.trishawDamage.findMany({
    where: { trishawId },
    orderBy: { reportedAt: "desc" },
    select: damageSelect,
    take,
  });

const openReachingWhere = (chapterIds: string[]) =>
  ({
    clearedAt: null,
    trishaw: { storageLocation: reachableLocationWhere(chapterIds) },
  }) satisfies Prisma.TrishawDamageWhereInput;

export const findOpenDamagesReaching = (chapterIds: string[], take: number) =>
  prisma.trishawDamage.findMany({
    where: openReachingWhere(chapterIds),
    orderBy: [{ grounding: "desc" }, { reportedAt: "asc" }],
    select: {
      id: true,
      trishawId: true,
      description: true,
      grounding: true,
      reportedAt: true,
      trishaw: {
        select: {
          name: true,
          storageLocation: {
            select: {
              ownerChapterId: true,
              chapters: {
                where: { chapterId: { in: chapterIds }, status: "approved" },
                select: { chapterId: true },
              },
            },
          },
        },
      },
    },
    take,
  });

export const countOpenDamagesReaching = (chapterIds: string[]) =>
  prisma.trishawDamage.count({ where: openReachingWhere(chapterIds) });

export const findDamagesOfRide = (rideId: string, reportedByUserId: string) =>
  prisma.trishawDamage.findMany({
    where: { rideId, reportedByUserId },
    orderBy: { reportedAt: "asc" },
    select: damageSelect,
  });
