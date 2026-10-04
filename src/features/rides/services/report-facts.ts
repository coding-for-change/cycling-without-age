import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

const factSelect = {
  id: true,
  chapterId: true,
  model: true,
  status: true,
  startsAt: true,
  endsAt: true,
  cancellationCategory: true,
  assignments: { where: { role: "pilot" }, select: { userId: true } },
  roster: { select: { passengerId: true } },
} satisfies Prisma.RideSelect;

export type RideFactRow = Prisma.RideGetPayload<{ select: typeof factSelect }>;

export const findRideFacts = (chapterIds: string[], from: Date, to: Date) =>
  prisma.ride.findMany({
    where: {
      chapterId: { in: chapterIds },
      startsAt: { gte: from, lt: to },
    },
    select: factSelect,
  });

const ridden = (since: Date, until: Date) =>
  ({
    status: { not: "cancelled" },
    startsAt: { gte: since },
    endsAt: { lt: until },
  }) satisfies Prisma.RideWhereInput;

export const findRiddenPilots = (
  chapterIds: string[],
  since: Date,
  until: Date,
) =>
  prisma.rideAssignment.findMany({
    where: {
      role: "pilot",
      ride: { chapterId: { in: chapterIds }, ...ridden(since, until) },
    },
    select: { userId: true, ride: { select: { chapterId: true } } },
  });

export const findRiddenPassengers = (
  chapterIds: string[],
  since: Date,
  until: Date,
) =>
  prisma.rideRosterEntry.findMany({
    where: { ride: { chapterId: { in: chapterIds }, ...ridden(since, until) } },
    select: { passengerId: true, ride: { select: { chapterId: true } } },
  });

export const findPassengersWithRideBefore = (
  passengerIds: string[],
  before: Date,
) =>
  prisma.rideRosterEntry.findMany({
    where: {
      passengerId: { in: passengerIds },
      ride: { status: { not: "cancelled" }, startsAt: { lt: before } },
    },
    distinct: ["passengerId"],
    select: { passengerId: true },
  });

export const findEarliestRideStart = (chapterIds: string[]) =>
  prisma.ride.findFirst({
    where: { chapterId: { in: chapterIds } },
    orderBy: { startsAt: "asc" },
    select: { startsAt: true },
  });
