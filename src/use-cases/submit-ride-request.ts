import * as Sentry from "@sentry/nextjs";
import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { membership } from "@/features/membership";
import { passengers, pickupOf, type Pickup } from "@/features/passengers";
import { profile } from "@/features/profile";
import { rideLocations } from "@/features/ride-locations";
import { rides } from "@/features/rides";
import {
  REQUEST_LIMITS,
  rideRequestInput,
  rideRequests,
  type RideRequestInput,
} from "@/features/ride-requests";
import { bookingRefusal, instantOn } from "@/lib/booking-windows";
import { DomainError } from "@/lib/domain-error";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import { scheduleAutomatically } from "./schedule-from-request";

/**
 * How many riders one request may name: the seats of the chapter's largest
 * trishaw, and never more than one ride of the model takes.
 */
export const maxRidersFor = (seats: number) =>
  Math.max(1, Math.min(seats, REQUEST_LIMITS.riders));

export type BookableRider = {
  id: string;
  firstName: string;
  lastName: string;
  chapterId: string;
  bookable: boolean;
  home: Pickup | null;
  careCenterId: string | null;
};

/**
 * The riders an account books for, and whether it may still book for each:
 * only while it is a member of the rider's chapter. A carer who left the
 * chapter keeps the rider until the chapter hands them over, but cannot send
 * requests for them. A rider who is the account itself is picked up where the
 * account lives.
 */
export async function ridersToBook(userId: string): Promise<BookableRider[]> {
  const [riders, memberships, own] = await Promise.all([
    passengers.listPassengersManagedBy(userId),
    membership.listMembershipsOfUser(userId),
    profile.getProfile(userId),
  ]);
  const member = new Set(
    memberships
      .filter((membership) => membership.roles.length > 0)
      .map((membership) => membership.chapterId),
  );
  return riders.map((rider) => ({
    id: rider.id,
    firstName: rider.firstName,
    lastName: rider.lastName,
    chapterId: rider.chapterId,
    bookable: member.has(rider.chapterId),
    home: pickupOf(
      rider.userId === userId && own ? { ...rider, user: own } : rider,
    ),
    careCenterId: rider.rideLocationId ?? null,
  }));
}

async function placeOf(
  rideLocationId: string | null,
  pickup: {
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null,
  chapterId: string,
) {
  if (rideLocationId) {
    const location = await rideLocations.requireUsableRideLocation(
      rideLocationId,
      chapterId,
    );
    return {
      rideLocationId: location.id,
      pickupName: location.name,
      pickupAddress: location.address,
      pickupLatitude: location.latitude,
      pickupLongitude: location.longitude,
    };
  }
  return {
    rideLocationId: null,
    pickupName: pickup?.name ?? null,
    pickupAddress: pickup?.address ?? null,
    pickupLatitude: pickup?.latitude ?? null,
    pickupLongitude: pickup?.longitude ?? null,
  };
}

/**
 * Lifecycle 1B–1D. The chapter is the riders' own, read from the riders this
 * account manages — never one the client names — and the window must pass the
 * chapter's booking policy on its own wall clock. A chapter that schedules
 * automatically gets a ride straight away when a trishaw is free; otherwise,
 * or when none is, the request waits on the Ride Request List.
 */
export async function submitRideRequest(
  input: RideRequestInput,
  userId: string,
  now = new Date(),
) {
  const data = rideRequestInput.parse(input);
  const riders = await ridersToBook(userId);
  const chosen = data.passengerIds.map((id) =>
    riders.find((rider) => rider.id === id),
  );
  if (chosen.some((rider) => !rider)) throw new DomainError("unknownPassenger");
  const picked = chosen as BookableRider[];
  const chapterId = picked[0].chapterId;
  if (picked.some((rider) => rider.chapterId !== chapterId))
    throw new DomainError("riderNotInChapter");
  if (picked.some((rider) => !rider.bookable))
    throw new DomainError("notChapterMember");

  const [chapter, { settings, hours, policy }, seats] = await Promise.all([
    chapters.getChapter(chapterId),
    chapters.getBookingPolicy(chapterId, now),
    fleet.maxSeats(chapterId),
  ]);
  if (!chapter) throw new DomainError("unknownChapter");
  if (picked.length > maxRidersFor(seats))
    throw new DomainError("tooManyRiders");

  const { date, startMinute, endMinute } = data.window;
  const requestedStartsAt = instantOn(date, startMinute, chapter.timeZone);
  const requestedEndsAt = instantOn(date, endMinute, chapter.timeZone);
  const refusal = bookingRefusal(
    { startsAt: requestedStartsAt, endsAt: requestedEndsAt },
    hours,
    policy,
    chapter.timeZone,
    now,
  );
  if (refusal) throw new DomainError(refusal);

  const window = { startsAt: requestedStartsAt, endsAt: requestedEndsAt };
  const riderIds = picked.map((rider) => rider.id);
  await rideRequests.assertCanAsk(userId, riderIds, window, now);
  if (await rides.ridersBookedBetween(riderIds, window))
    throw new DomainError("riderBooked");

  const functional = data.model === "functional";
  const automatic = settings.schedulingMethod === "auto";
  const request = await rideRequests.submit(
    {
      chapterId,
      requesterUserId: userId,
      model: data.model,
      passengerIds: riderIds,
      ...(await placeOf(data.rideLocationId, data.pickup, chapterId)),
      destinationName: functional ? (data.destination?.name ?? null) : null,
      destinationAddress: functional
        ? (data.destination?.address ?? null)
        : null,
      destinationLatitude: functional
        ? (data.destination?.latitude ?? null)
        : null,
      destinationLongitude: functional
        ? (data.destination?.longitude ?? null)
        : null,
      roundTrip: functional && data.roundTrip,
      requestedStartsAt,
      requestedEndsAt,
      note: data.note,
    },
    { announce: !automatic },
  );
  if (!automatic) return { id: request.id, rideId: null };

  const ride = await scheduleAutomatically(request.id).catch((error) => {
    Sentry.captureException(error);
    logger.error(
      { err: serializeError(error), request_id: request.id },
      "automatic scheduling failed",
    );
    return null;
  });
  if (!ride) await rideRequests.announce(request.id);
  return { id: request.id, rideId: ride?.id ?? null };
}
