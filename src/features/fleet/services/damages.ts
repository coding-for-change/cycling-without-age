import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

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

export const findDamagesOfRide = (rideId: string, reportedByUserId: string) =>
  prisma.trishawDamage.findMany({
    where: { rideId, reportedByUserId },
    orderBy: { reportedAt: "asc" },
    select: damageSelect,
  });
