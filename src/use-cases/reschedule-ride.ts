import * as Sentry from "@sentry/nextjs";
import { passengers } from "@/features/passengers";
import type { RideRequestInput } from "@/features/ride-requests";
import { rides } from "@/features/rides";
import { DomainError } from "@/lib/domain-error";
import { serializeError } from "@/lib/observability/errors";
import { logger } from "@/lib/observability/logger";
import { submitRideRequest } from "./submit-ride-request";

async function heldSeats(rideId: string, userId: string) {
  const riders = await passengers.listRidersOfAccount(userId);
  const ride = await rides.getRideForPassengers(
    rideId,
    riders.map((rider) => rider.id),
  );
  if (!ride) throw new DomainError("unknownRide");
  const passengerIds = ride.roster.flatMap(({ passenger, attendance }) =>
    passenger && attendance === "booked" ? [passenger.id] : [],
  );
  return { ride, passengerIds };
}

const open = (ride: { status: string; startsAt: Date }, now: Date) =>
  ride.status === "scheduled" && ride.startsAt > now;

export async function cancelRideSeats(
  rideId: string,
  userId: string,
  now = new Date(),
) {
  const { ride, passengerIds } = await heldSeats(rideId, userId);
  if (!open(ride, now) || !passengerIds.length)
    throw new DomainError("rideClosed");
  for (const passengerId of passengerIds)
    await rides.cancelSeat(ride.id, passengerId, userId, now);
  return passengerIds.length;
}

export async function rescheduleRide(
  fromRideId: string,
  input: RideRequestInput,
  userId: string,
  now = new Date(),
) {
  const { ride, passengerIds } = await heldSeats(fromRideId, userId);
  if (ride.model === "event" || !open(ride, now) || !passengerIds.length)
    throw new DomainError("rideClosed");

  const legs = [ride.id, ride.returnLeg?.id, ride.returnLegOf?.id].filter(
    (id): id is string => Boolean(id),
  );
  const request = await submitRideRequest(input, userId, now, {
    replacesRideIds: legs,
  });

  let kept = 0;
  for (const passengerId of passengerIds)
    await rides.cancelSeat(ride.id, passengerId, userId, now).catch((error) => {
      kept += 1;
      Sentry.captureException(error);
      logger.error(
        {
          err: serializeError(error),
          ride_id: ride.id,
          request_id: request.id,
        },
        "reschedule left the old seat in place",
      );
    });
  return { ...request, oldSeatsKept: kept > 0 };
}
