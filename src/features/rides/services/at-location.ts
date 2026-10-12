import { prisma } from "@/lib/prisma";

export const countUpcomingRidesByLocation = (
  locationIds: string[],
  from: Date,
) =>
  prisma.ride.groupBy({
    by: ["rideLocationId"],
    where: {
      rideLocationId: { in: locationIds },
      status: "scheduled",
      startsAt: { gte: from },
    },
    _count: { _all: true },
  });

export const findUpcomingRidesAtLocation = (
  locationId: string,
  from: Date,
  take: number,
) =>
  prisma.ride.findMany({
    where: {
      rideLocationId: locationId,
      status: "scheduled",
      startsAt: { gte: from },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      model: true,
      title: true,
      startsAt: true,
      endsAt: true,
      requiredPilots: true,
      _count: { select: { roster: true, assignments: true } },
    },
  });
