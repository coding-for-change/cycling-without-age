import { prisma } from "@/lib/prisma";
import type { $Enums, Prisma } from "@/generated/prisma";

type Db = Prisma.TransactionClient;

const legSelect = {
  id: true,
  status: true,
  startsAt: true,
  endsAt: true,
} as const;

export const requestSelect = {
  id: true,
  chapterId: true,
  status: true,
  model: true,
  requesterUserId: true,
  rideLocationId: true,
  pickupName: true,
  pickupAddress: true,
  pickupLatitude: true,
  pickupLongitude: true,
  destinationName: true,
  destinationAddress: true,
  destinationLatitude: true,
  destinationLongitude: true,
  roundTrip: true,
  requestedStartsAt: true,
  requestedEndsAt: true,
  note: true,
  decidedByUserId: true,
  decidedAt: true,
  decisionNote: true,
  rideId: true,
  createdAt: true,
  updatedAt: true,
  chapter: {
    select: { id: true, name: true, slug: true, timeZone: true },
  },
  rideLocation: { select: { id: true, name: true, kind: true } },
  requester: {
    select: { id: true, name: true, email: true, phoneNumber: true },
  },
  decidedBy: { select: { id: true, name: true } },
  ride: { select: { ...legSelect, returnLeg: { select: legSelect } } },
  passengers: {
    orderBy: { position: "asc" },
    select: {
      passenger: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          chapterId: true,
          managedByUserId: true,
          userId: true,
          needsWheelchairBike: true,
        },
      },
    },
  },
} satisfies Prisma.RideRequestSelect;

export type RideRequestRecord = Prisma.RideRequestGetPayload<{
  select: typeof requestSelect;
}>;

export const insertRideRequest = (
  data: Prisma.RideRequestUncheckedCreateInput,
  passengerIds: string[],
  db: Db,
) =>
  db.rideRequest.create({
    data: {
      ...data,
      passengers: {
        create: passengerIds.map((passengerId, position) => ({
          passengerId,
          position,
        })),
      },
    },
    select: { id: true, chapterId: true },
  });

export const findRideRequest = (id: string, db: Db = prisma) =>
  db.rideRequest.findUnique({ where: { id }, select: requestSelect });

export const findRideRequestScope = (id: string) =>
  prisma.rideRequest.findUnique({
    where: { id },
    select: { id: true, chapterId: true, status: true, requesterUserId: true },
  });

export const findRideRequests = (
  chapterIds: string[],
  status: $Enums.RideRequestStatus | null,
  take: number,
) =>
  prisma.rideRequest.findMany({
    where: {
      chapterId: { in: chapterIds },
      ...(status ? { status } : {}),
    },
    orderBy: [{ requestedStartsAt: "asc" }, { createdAt: "asc" }],
    take,
    select: requestSelect,
  });

export const countRideRequests = (
  chapterIds: string[],
  status: $Enums.RideRequestStatus,
) =>
  prisma.rideRequest.count({
    where: { chapterId: { in: chapterIds }, status },
  });

export const findRideRequestsOfRequester = (
  requesterUserId: string,
  since: Date,
  take: number,
) =>
  prisma.rideRequest.findMany({
    where: {
      requesterUserId,
      OR: [{ status: "pending" }, { updatedAt: { gte: since } }],
    },
    orderBy: [{ requestedStartsAt: "asc" }, { createdAt: "asc" }],
    take,
    select: requestSelect,
  });

export const findDestinationsOfRequester = (
  requesterUserId: string,
  take: number,
) =>
  prisma.rideRequest.findMany({
    where: { requesterUserId, destinationName: { not: null } },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      destinationName: true,
      destinationAddress: true,
      destinationLatitude: true,
      destinationLongitude: true,
    },
  });

export const claimPendingRequest = (
  id: string,
  decidedByUserId: string | null,
  decidedAt: Date,
) =>
  prisma.rideRequest.updateMany({
    where: { id, status: "pending" },
    data: { status: "scheduled", decidedByUserId, decidedAt },
  });

export const releaseClaimedRequest = (id: string) =>
  prisma.rideRequest.updateMany({
    where: { id, status: "scheduled", rideId: null },
    data: { status: "pending", decidedByUserId: null, decidedAt: null },
  });

export const linkRequestToRide = (id: string, rideId: string, db: Db) =>
  db.rideRequest.updateMany({
    where: { id, status: "scheduled", rideId: null },
    data: { rideId },
  });

export const closePendingRequest = (
  id: string,
  data: {
    status: "declined" | "withdrawn";
    decidedByUserId: string | null;
    decidedAt: Date;
    decisionNote?: string | null;
  },
  requesterUserId: string | null,
  db: Db,
) =>
  db.rideRequest.updateMany({
    where: {
      id,
      status: "pending",
      ...(requesterUserId ? { requesterUserId } : {}),
    },
    data,
  });
