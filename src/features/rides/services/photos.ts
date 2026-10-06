import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const findStoredFiles = (
  ids: string[],
  db: Prisma.TransactionClient = prisma,
) =>
  db.storedFile.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      kind: true,
      uploadedByUserId: true,
      ridePhotos: { select: { rideId: true } },
    },
  });

export const findRidePhotoFile = (id: string) =>
  prisma.storedFile.findUnique({
    where: { id },
    select: {
      id: true,
      key: true,
      kind: true,
      mime: true,
      size: true,
      uploadedByUserId: true,
      ridePhotos: {
        take: 1,
        select: {
          ride: {
            select: {
              chapterId: true,
              chapter: { select: { countryId: true } },
            },
          },
        },
      },
    },
  });
