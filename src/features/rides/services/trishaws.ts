import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const trishawSelect = {
  id: true,
  chapterId: true,
  name: true,
  type: true,
  seats: true,
  status: true,
  chapter: { select: { id: true, name: true, timeZone: true } },
  storageLocation: {
    select: { id: true, name: true, chapters: { select: { chapterId: true } } },
  },
} satisfies Prisma.TrishawSelect;

export type TrishawRow = Prisma.TrishawGetPayload<{
  select: typeof trishawSelect;
}>;

/**
 * A chapter reaches the trishaws it owns *and* the ones parked at a site it
 * shares, so this is an OR rather than a filter on `chapterId`.
 */
export const findTrishawsOfChapters = (chapterIds: string[]) =>
  prisma.trishaw.findMany({
    where: {
      OR: [
        { chapterId: { in: chapterIds } },
        {
          storageLocation: {
            chapters: { some: { chapterId: { in: chapterIds } } },
          },
        },
      ],
    },
    orderBy: [{ chapterId: "asc" }, { name: "asc" }],
    select: trishawSelect,
  });

export const findTrishawById = (id: string) =>
  prisma.trishaw.findUnique({ where: { id }, select: trishawSelect });

export const insertTrishaw = (data: Prisma.TrishawUncheckedCreateInput) =>
  prisma.trishaw.create({ data, select: trishawSelect });

export const updateTrishawById = (
  id: string,
  data: Prisma.TrishawUncheckedUpdateInput,
) => prisma.trishaw.update({ where: { id }, data, select: trishawSelect });
