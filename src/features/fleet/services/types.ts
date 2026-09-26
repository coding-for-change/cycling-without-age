import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const typeSelect = {
  id: true,
  name: true,
  scope: true,
  countryId: true,
  chapterId: true,
  description: true,
  seats: true,
  wheelchairAccessible: true,
  photoFileId: true,
  manualFileId: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  country: { select: { id: true, name: true, code: true } },
  chapter: { select: { id: true, name: true, countryId: true } },
  photos: { orderBy: { position: "asc" }, select: { fileId: true } },
  _count: { select: { trishaws: true } },
} satisfies Prisma.TrishawTypeSelect;

export type TrishawTypeRow = Prisma.TrishawTypeGetPayload<{
  select: typeof typeSelect;
}>;

export const findTypes = (where: Prisma.TrishawTypeWhereInput) =>
  prisma.trishawType.findMany({
    where,
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    select: typeSelect,
    take: 500,
  });

export const findTypeById = (id: string) =>
  prisma.trishawType.findUnique({ where: { id }, select: typeSelect });

export const insertType = (data: Prisma.TrishawTypeUncheckedCreateInput) =>
  prisma.trishawType.create({ data, select: typeSelect });

export const updateTypeById = (
  id: string,
  data: Prisma.TrishawTypeUncheckedUpdateInput,
) => prisma.trishawType.update({ where: { id }, data, select: typeSelect });

export async function replaceTypePhotos(
  typeId: string,
  fileIds: string[],
  db: Prisma.TransactionClient,
) {
  await db.trishawTypePhoto.deleteMany({ where: { typeId } });
  await db.trishawTypePhoto.createMany({
    data: fileIds.map((fileId, position) => ({ typeId, fileId, position })),
  });
  return db.trishawType.update({
    where: { id: typeId },
    data: { photoFileId: fileIds[0] ?? null },
    select: typeSelect,
  });
}

export const deleteTypeById = (id: string) =>
  prisma.trishawType.delete({ where: { id }, select: { id: true } });
