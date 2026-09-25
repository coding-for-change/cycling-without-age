import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const locationSelect = {
  id: true,
  kind: true,
  name: true,
  ownerChapterId: true,
  countryId: true,
  isDefault: true,
  poolCode: true,
  membersMayManage: true,
  address: true,
  latitude: true,
  longitude: true,
  entrance: true,
  entrancePhotoFileId: true,
  accessCode: true,
  accessNotes: true,
  returnInstructions: true,
  archivedAt: true,
  createdAt: true,
  ownerChapter: { select: { id: true, name: true, countryId: true } },
  country: { select: { id: true, name: true, code: true } },
  chapters: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      chapterId: true,
      status: true,
      createdAt: true,
      decidedAt: true,
      decisionNote: true,
      chapter: { select: { id: true, name: true, countryId: true } },
    },
  },
  _count: { select: { trishaws: true } },
} satisfies Prisma.StorageLocationSelect;

export type LocationRow = Prisma.StorageLocationGetPayload<{
  select: typeof locationSelect;
}>;

export const reachableLocationWhere = (
  chapterIds: string[],
): Prisma.StorageLocationWhereInput => ({
  OR: [
    { ownerChapterId: { in: chapterIds } },
    {
      kind: "pool",
      chapters: { some: { chapterId: { in: chapterIds }, status: "approved" } },
    },
  ],
});

export const findLocations = (where: Prisma.StorageLocationWhereInput) =>
  prisma.storageLocation.findMany({
    where,
    orderBy: [{ kind: "asc" }, { isDefault: "desc" }, { name: "asc" }],
    select: locationSelect,
  });

export const findLocationById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.storageLocation.findUnique({ where: { id }, select: locationSelect });

export const findPoolByCode = (poolCode: string) =>
  prisma.storageLocation.findUnique({
    where: { poolCode },
    select: locationSelect,
  });

export const insertLocation = (
  data: Prisma.StorageLocationUncheckedCreateInput,
) => prisma.storageLocation.create({ data, select: locationSelect });

export const updateLocationById = (
  id: string,
  data: Prisma.StorageLocationUncheckedUpdateInput,
) =>
  prisma.storageLocation.update({
    where: { id },
    data,
    select: locationSelect,
  });

export const deleteLocationById = (id: string) =>
  prisma.storageLocation.delete({ where: { id }, select: { id: true } });

export const findDefaultLocation = (chapterId: string) =>
  prisma.storageLocation.findFirst({
    where: { ownerChapterId: chapterId, isDefault: true },
    select: locationSelect,
  });
