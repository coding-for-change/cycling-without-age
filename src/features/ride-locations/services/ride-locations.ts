import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const rowSelect = {
  id: true,
  chapterId: true,
  kind: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  contactName: true,
  contactPhone: true,
  contactEmail: true,
  notes: true,
  typicalRideKm: true,
  defaultTrishawCount: true,
  defaultPilotCount: true,
  defaultMinutes: true,
  archivedAt: true,
  createdAt: true,
  chapter: { select: { id: true, name: true, timeZone: true } },
} satisfies Prisma.RideLocationSelect;

export type RideLocationRecord = Prisma.RideLocationGetPayload<{
  select: typeof rowSelect;
}>;

export const findRideLocations = (
  chapterIds: string[],
  includeArchived: boolean,
) =>
  prisma.rideLocation.findMany({
    where: {
      chapterId: { in: chapterIds },
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    select: rowSelect,
  });

export const findRideLocationById = (id: string) =>
  prisma.rideLocation.findUnique({ where: { id }, select: rowSelect });

export const findRideLocationChapter = (id: string) =>
  prisma.rideLocation.findUnique({
    where: { id },
    select: { chapterId: true, archivedAt: true },
  });

export const insertRideLocation = (
  data: Prisma.RideLocationUncheckedCreateInput,
) => prisma.rideLocation.create({ data, select: rowSelect });

export const updateRideLocationById = (
  id: string,
  data: Prisma.RideLocationUncheckedUpdateInput,
) => prisma.rideLocation.update({ where: { id }, data, select: rowSelect });
