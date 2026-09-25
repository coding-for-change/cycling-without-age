import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { reachableLocationWhere } from "./locations";

export const trishawSelect = {
  id: true,
  name: true,
  frameNumber: true,
  status: true,
  note: true,
  typeId: true,
  photoFileId: true,
  createdAt: true,
  type: {
    select: {
      id: true,
      name: true,
      seats: true,
      wheelchairAccessible: true,
      photoFileId: true,
      manualFileId: true,
    },
  },
  storageLocation: {
    select: {
      id: true,
      name: true,
      kind: true,
      ownerChapterId: true,
      countryId: true,
      membersMayManage: true,
      ownerChapter: { select: { id: true, name: true, countryId: true } },
      chapters: {
        where: { status: "approved" },
        select: { chapterId: true, chapter: { select: { countryId: true } } },
      },
    },
  },
  photos: { orderBy: { position: "asc" }, select: { fileId: true } },
  damages: {
    where: { clearedAt: null },
    orderBy: { reportedAt: "desc" },
    select: { id: true, grounding: true, reportedAt: true },
  },
} satisfies Prisma.TrishawSelect;

export type TrishawRow = Prisma.TrishawGetPayload<{
  select: typeof trishawSelect;
}>;

export const findTrishawsOfChapters = (chapterIds: string[]) =>
  prisma.trishaw.findMany({
    where: { storageLocation: reachableLocationWhere(chapterIds) },
    orderBy: [{ name: "asc" }],
    select: trishawSelect,
  });

export const findTrishawsByIds = (ids: string[]) =>
  prisma.trishaw.findMany({
    where: { id: { in: ids } },
    select: trishawSelect,
  });

export const findTrishawById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.trishaw.findUnique({ where: { id }, select: trishawSelect });

export const insertTrishaw = (
  data: Prisma.TrishawUncheckedCreateInput,
  db: Prisma.TransactionClient = prisma,
) => db.trishaw.create({ data, select: trishawSelect });

export const updateTrishawById = (
  id: string,
  data: Prisma.TrishawUncheckedUpdateInput,
  db: Prisma.TransactionClient = prisma,
) => db.trishaw.update({ where: { id }, data, select: trishawSelect });

export async function replaceTrishawPhotos(
  trishawId: string,
  fileIds: string[],
  db: Prisma.TransactionClient,
) {
  await db.trishawPhoto.deleteMany({ where: { trishawId } });
  await db.trishawPhoto.createMany({
    data: fileIds.map((fileId, position) => ({ trishawId, fileId, position })),
  });
  return db.trishaw.update({
    where: { id: trishawId },
    data: { photoFileId: fileIds[0] ?? null },
    select: trishawSelect,
  });
}

export const deleteTrishawById = (id: string) =>
  prisma.trishaw.delete({ where: { id }, select: { id: true } });

export const findTrishawIdsAt = async (storageLocationId: string) =>
  (
    await prisma.trishaw.findMany({
      where: { storageLocationId },
      select: { id: true },
    })
  ).map((row) => row.id);
