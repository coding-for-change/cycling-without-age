import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { rideRequests, type RideRequestRow } from "@/features/ride-requests";
import {
  returnWindow,
  rideInput,
  rides,
  type ScheduleRideData,
} from "@/features/rides";
import { DomainError } from "@/lib/domain-error";
import { scheduleRideAt } from "./schedule-ride";

type ScheduledRide = { id: string; returnLegId: string | null };

const MINUTE_MS = 60_000;

const ridersOf = (request: RideRequestRow) =>
  request.passengers.map(({ passenger }) => passenger);

/**
 * The request is claimed before its ride is written, so it is scheduled once
 * however many admins press the button; a ride that cannot be written hands
 * the request back to the list.
 */
async function scheduleClaimed(
  request: RideRequestRow,
  actorUserId: string | null,
  write: () => Promise<ScheduledRide>,
) {
  await rideRequests.claim(request.id, actorUserId);
  let ride: ScheduledRide;
  try {
    ride = await write();
  } catch (error) {
    await rideRequests.release(request.id);
    throw error;
  }
  await rideRequests.markScheduled(
    request.id,
    { id: ride.id, returnLegId: ride.returnLegId },
    actorUserId,
  );
  return ride;
}

/**
 * Lifecycle 2B-a from a request: the drawer opened prefilled, the admin may
 * have changed the time, the place or the bikes, but the ride is always the
 * request's chapter's and always carries the request's riders.
 */
export async function scheduleFromRequest(
  requestId: string,
  form: ScheduleRideData,
  actorUserId: string,
) {
  const request = await rideRequests.requirePending(requestId);
  const riders = ridersOf(request);
  if (!riders.length) throw new DomainError("unknownPassenger");
  if (form.chapterId !== request.chapterId)
    throw new DomainError("riderNotInChapter");
  if (riders.some((rider) => !form.passengerIds.includes(rider.id)))
    throw new DomainError("unknownPassenger");

  return scheduleClaimed(request, actorUserId, () =>
    scheduleRideAt(form, actorUserId, { requestId }),
  );
}

/**
 * Lifecycle 2B-b: a chapter that schedules automatically turns a request into
 * a ride when a trishaw that takes its riders is free for the window. The
 * bikes are picked under their locks inside the ride's own write, never
 * checked first and booked after. `null` when nothing is free, so the request
 * stays on the list for an admin.
 */
export async function scheduleAutomatically(requestId: string) {
  const request = await rideRequests.requirePending(requestId);
  const riders = ridersOf(request);
  if (!riders.length) return null;

  const [settings, trishaws] = await Promise.all([
    chapters.getSettings(request.chapterId),
    fleet.listTrishaws([request.chapterId]),
  ]);
  const wheelchair = riders.some((rider) => rider.needsWheelchairBike);
  const candidates = trishaws
    .filter(
      (trishaw) =>
        trishaw.status === "active" &&
        !fleet.isGrounded(trishaw) &&
        (trishaw.type?.seats ?? 2) >= riders.length &&
        (!wheelchair || trishaw.type?.wheelchairAccessible === true),
    )
    .map((trishaw) => trishaw.id);
  if (!candidates.length) return null;

  const requested =
    request.requestedEndsAt.getTime() - request.requestedStartsAt.getTime();
  const startsAt = request.requestedStartsAt;
  const outbound = {
    startsAt,
    endsAt: new Date(
      startsAt.getTime() +
        Math.min(settings.defaultRideMinutes * MINUTE_MS, requested),
    ),
  };
  const returnLeg =
    request.model === "functional" && request.roundTrip
      ? returnWindow(outbound, settings.defaultStayMinutes)
      : undefined;

  const busy = await rides.bookedTrishawIds(candidates, [
    outbound,
    ...(returnLeg ? [returnLeg] : []),
  ]);
  if (candidates.every((id) => busy.has(id))) return null;

  const ride = rideInput.parse({
    chapterId: request.chapterId,
    model: request.model,
    ...outbound,
    rideLocationId: request.rideLocationId,
    locationName: request.pickupName,
    locationAddress: request.pickupAddress,
    latitude: request.pickupLatitude,
    longitude: request.pickupLongitude,
    destinationName: request.destinationName,
    destinationAddress: request.destinationAddress,
    destinationLatitude: request.destinationLatitude,
    destinationLongitude: request.destinationLongitude,
    requiredPilots:
      request.model === "pleasure" ? 1 : settings.requiredPilotsDefault,
    passengerIds: riders.map((rider) => rider.id),
    returnLeg,
  });

  try {
    return await scheduleClaimed(request, null, () =>
      rides.scheduleRide(ride, null, {
        opensForSignUp: settings.pilotsMaySelfAssign,
        staffingLeadHours: settings.staffingCheckLeadHours,
        requestId,
        pickTrishaws: { candidates, count: 1 },
      }),
    );
  } catch (error) {
    if (error instanceof DomainError) return null;
    throw error;
  }
}
