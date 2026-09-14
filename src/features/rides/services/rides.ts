import { prisma } from "@/lib/prisma";
import type { $Enums, Prisma } from "@/generated/prisma";

/**
 * What every calendar surface renders. Kept in one place so the week grid, the
 * trishaw timeline and the two agendas cannot drift into different shapes.
 */
const calendarSelect = {
  id: true,
  chapterId: true,
  model: true,
  status: true,
  startsAt: true,
  endsAt: true,
  locationName: true,
  locationAddress: true,
  destinationName: true,
  destinationAddress: true,
  cancelledAt: true,
  chapter: { select: { id: true, name: true, timeZone: true } },
  trishaws: {
    orderBy: { trishaw: { name: "asc" } },
    select: { trishaw: { select: { id: true, name: true, type: true } } },
  },
  assignments: {
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  _count: { select: { roster: true } },
} satisfies Prisma.RideSelect;

export type RideCalendarRow = Prisma.RideGetPayload<{
  select: typeof calendarSelect;
}>;

/**
 * Overlap, not containment: a ride that starts before the window and ends
 * inside it still occupies the window and must be drawn.
 */
const overlapping = (from: Date, to: Date) => ({
  startsAt: { lt: to },
  endsAt: { gt: from },
});

export const findRidesInRange = (chapterIds: string[], from: Date, to: Date) =>
  prisma.ride.findMany({
    where: { chapterId: { in: chapterIds }, ...overlapping(from, to) },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: calendarSelect,
  });

/**
 * Current membership is required as well as the assignment: removing someone
 * from a chapter deletes only their `member` row, so their `RideAssignment`
 * rows outlive it. Without this clause a removed pilot would keep reading that
 * chapter's rides — location, trishaw and roster size included.
 */
export const findRidesForPilot = (userId: string, from: Date, to: Date) =>
  prisma.ride.findMany({
    where: {
      assignments: { some: { userId } },
      chapter: { members: { some: { userId } } },
      ...overlapping(from, to),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: calendarSelect,
  });

export const findRidesForPassengers = (
  passengerIds: string[],
  from: Date,
  to: Date,
) =>
  prisma.ride.findMany({
    where: {
      roster: { some: { passengerId: { in: passengerIds } } },
      ...overlapping(from, to),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: calendarSelect,
  });

export const findRideById = (id: string) =>
  prisma.ride.findUnique({ where: { id }, select: calendarSelect });

/**
 * Reservations already holding any of these trishaws in the window, so the
 * caller can name the one that clashed. `exceptRideId` lets a ride being
 * rescheduled ignore its own current reservations.
 *
 * A cancelled ride releases its equipment, which is why it is excluded here
 * rather than filtered by the caller.
 */
export const findTrishawConflicts = (
  trishawIds: string[],
  from: Date,
  to: Date,
  exceptRideId?: string,
) =>
  prisma.rideTrishaw.findMany({
    where: {
      trishawId: { in: trishawIds },
      ride: {
        status: { not: "cancelled" },
        ...overlapping(from, to),
        ...(exceptRideId ? { id: { not: exceptRideId } } : {}),
      },
    },
    select: { trishawId: true, rideId: true },
  });

export const insertRide = (
  data: Prisma.RideUncheckedCreateInput,
  trishawIds: string[],
) =>
  prisma.ride.create({
    data: {
      ...data,
      trishaws: { create: trishawIds.map((trishawId) => ({ trishawId })) },
    },
    select: calendarSelect,
  });

/** Rescheduling replaces the reservation set outright, never merges into it. */
export const updateRideById = (
  id: string,
  data: Prisma.RideUncheckedUpdateInput,
  trishawIds?: string[],
) =>
  prisma.ride.update({
    where: { id },
    data: {
      ...data,
      ...(trishawIds
        ? {
            trishaws: {
              deleteMany: {},
              create: trishawIds.map((trishawId) => ({ trishawId })),
            },
          }
        : {}),
    },
    select: calendarSelect,
  });

export const upsertAssignment = (
  rideId: string,
  userId: string,
  role: $Enums.RideRole,
) =>
  prisma.rideAssignment.upsert({
    where: { rideId_userId_role: { rideId, userId, role } },
    create: { rideId, userId, role },
    update: {},
  });

export const deleteAssignment = (
  rideId: string,
  userId: string,
  role: $Enums.RideRole,
) =>
  prisma.rideAssignment.delete({
    where: { rideId_userId_role: { rideId, userId, role } },
  });

/** Appended to the end of the roster — coordinators order riders as they ride. */
export const upsertRosterEntry = (
  rideId: string,
  passengerId: string,
  position: number,
) =>
  prisma.rideRosterEntry.upsert({
    where: { rideId_passengerId: { rideId, passengerId } },
    create: { rideId, passengerId, position },
    update: {},
  });

export const countRosterEntries = (rideId: string) =>
  prisma.rideRosterEntry.count({ where: { rideId } });

export const deleteRosterEntry = (rideId: string, passengerId: string) =>
  prisma.rideRosterEntry.delete({
    where: { rideId_passengerId: { rideId, passengerId } },
  });
