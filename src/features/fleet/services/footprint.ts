import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const countFleet = (
  locations: Prisma.StorageLocationWhereInput,
  types: Prisma.TrishawTypeWhereInput,
) =>
  Promise.all([
    prisma.trishaw.count({ where: { storageLocation: locations } }),
    prisma.storageLocation.count({ where: locations }),
    prisma.trishawType.count({ where: types }),
  ]);

export const countChapterFleet = (chapterId: string) =>
  countFleet({ ownerChapterId: chapterId }, { chapterId });

export const countCountryFleet = (countryId: string) =>
  countFleet(
    { OR: [{ countryId }, { ownerChapter: { countryId } }] },
    { OR: [{ countryId }, { chapter: { countryId } }] },
  );
