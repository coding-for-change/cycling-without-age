import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const fileSelect = {
  id: true,
  key: true,
  kind: true,
  mime: true,
  size: true,
  uploadedByUserId: true,
} satisfies Prisma.StoredFileSelect;

export const insertStoredFile = (data: Prisma.StoredFileUncheckedCreateInput) =>
  prisma.storedFile.create({ data, select: fileSelect });

export const findStoredFileById = (id: string) =>
  prisma.storedFile.findUnique({ where: { id }, select: fileSelect });

export const findFileOwners = (id: string) =>
  prisma.storedFile.findUnique({
    where: { id },
    select: {
      ...fileSelect,
      typePhotos: {
        select: { scope: true, countryId: true, chapterId: true },
        take: 1,
      },
      typeManuals: {
        select: { scope: true, countryId: true, chapterId: true },
        take: 1,
      },
      trishawPhotos: { select: { storageLocationId: true }, take: 1 },
      trishawGallery: {
        select: { trishaw: { select: { storageLocationId: true } } },
      },
      entrancePhotos: { select: { id: true }, take: 1 },
      damagePhotos: {
        select: {
          reportedByUserId: true,
          trishaw: { select: { storageLocationId: true } },
        },
        take: 1,
      },
    },
  });
