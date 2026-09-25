import { DomainError } from "@/lib/domain-error";
import {
  rideInput,
  trishawIdList,
  type RideInput,
  type RideRole,
} from "./schemas";
import {
  countFutureRidesWithTrishaws,
  countRosterEntries,
  deleteAssignment,
  deleteRosterEntry,
  findLatestRideForPilot,
  findRideById,
  findRideIdsWithTrishawFrom,
  findRidesForCalendarFeed,
  findRidesForPassengers,
  findRidesForPilot,
  findRidesInRange,
  findRidesOfTrishaw,
  insertRideReserving,
  updateRideById,
  updateRideReserving,
  upsertAssignment,
  upsertRosterEntry,
  type FeedAudience,
  type PilotRideRow,
  type RideCalendarRow,
  type RideFeedRow,
  type TrishawRideRow,
} from "./services/rides";

export type {
  FeedAudience,
  PilotRideRow,
  RideCalendarRow,
  RideFeedRow,
  TrishawRideRow,
};

export const listRidesInRange = (chapterIds: string[], from: Date, to: Date) =>
  chapterIds.length
    ? findRidesInRange(chapterIds, from, to)
    : Promise.resolve([]);

export const listRidesForPilot = (userId: string, from: Date, to: Date) =>
  findRidesForPilot(userId, from, to);

export const listRidesForPassengers = (
  passengerIds: string[],
  from: Date,
  to: Date,
) =>
  passengerIds.length
    ? findRidesForPassengers(passengerIds, from, to)
    : Promise.resolve([]);

/**
 * A feed is polled over and over, so it is capped. A care home with fifty
 * residents can outgrow any cap, and what it must not lose is what is coming
 * up — so the upcoming rides fill the cap first and the past gets the rest,
 * newest first. Past the cap, the rides furthest from now are the ones dropped.
 */
export const FEED_MAX_RIDES = 1000;

export async function listRidesForCalendarFeed(
  userId: string,
  audience: FeedAudience,
  from: Date,
  to: Date,
  now = new Date(),
): Promise<RideFeedRow[]> {
  if (!audience.pilotChapterIds.length && !audience.passengerIds.length)
    return [];

  const ahead = await findRidesForCalendarFeed(userId, audience, now, to, {
    take: FEED_MAX_RIDES,
  });
  const room = FEED_MAX_RIDES - ahead.length;
  if (room === 0) return ahead;

  const behind = await findRidesForCalendarFeed(userId, audience, from, now, {
    take: room,
    latestFirst: true,
    endedBy: now,
  });
  return [...behind.reverse(), ...ahead];
}

export const getRide = (id: string) => findRideById(id);

/**
 * Scheduling commits the equipment: lifecycle phase 2C reserves the trishaw for
 * the ride's window, after which it is "no longer available to others". A
 * cancelled ride releases it. Whether the chapter may use the trishaw at all is
 * the fleet's question, asked by the use case before this runs.
 */
export async function scheduleRide(input: RideInput) {
  const { trishawIds, ...data } = rideInput.parse(input);
  const ride = await insertRideReserving(
    data,
    trishawIds,
    data.startsAt,
    data.endsAt,
  );
  if (!ride) throw new DomainError("trishawReserved");
  return ride;
}

export async function rescheduleRide(id: string, input: RideInput) {
  const existing = await findRideById(id);
  if (!existing) throw new DomainError("unknownRide");
  const { trishawIds, ...data } = rideInput.parse(input);
  const ride = await updateRideReserving(
    id,
    data,
    trishawIds,
    data.startsAt,
    data.endsAt,
  );
  if (!ride) throw new DomainError("trishawReserved");
  return ride;
}

/**
 * Cancelling keeps the ride on the calendar — the glossary is explicit that a
 * cancellation "does not automatically remove the event from the Chapter
 * Operating Calendar" — but it does release the trishaw for the window.
 */
export async function cancelRide(id: string, reason?: string | null) {
  const existing = await findRideById(id);
  if (!existing) throw new DomainError("unknownRide");
  return updateRideById(id, {
    status: "cancelled",
    cancelledAt: new Date(),
    cancellationReason: reason?.trim() || null,
  });
}

export async function setRideTrishaws(rideId: string, trishawIds: string[]) {
  const ids = trishawIdList.parse(trishawIds);
  const existing = await findRideById(rideId);
  if (!existing || existing.status === "cancelled")
    throw new DomainError("unknownRide");
  const ride = await updateRideReserving(
    rideId,
    {},
    ids,
    existing.startsAt,
    existing.endsAt,
  );
  if (!ride) throw new DomainError("trishawReserved");
  return ride;
}

export const listRidesOfTrishaw = (trishawId: string, take = 50) =>
  findRidesOfTrishaw(trishawId, take);

export const upcomingRideIdsWithTrishaw = (
  trishawId: string,
  now = new Date(),
) => findRideIdsWithTrishawFrom(trishawId, now);

export const countFutureRidesUsing = (
  chapterId: string,
  trishawIds: string[],
  now = new Date(),
) =>
  trishawIds.length
    ? countFutureRidesWithTrishaws(chapterId, trishawIds, now)
    : Promise.resolve(0);

export const latestRideForPilot = (userId: string, now = new Date()) =>
  findLatestRideForPilot(userId, now);

/** Lifecycle phase 3 — a volunteer commits to a role on this ride. */
export async function assignVolunteer(
  rideId: string,
  userId: string,
  role: RideRole = "pilot",
) {
  if (!(await findRideById(rideId))) throw new DomainError("unknownRide");
  return upsertAssignment(rideId, userId, role);
}

export async function unassignVolunteer(
  rideId: string,
  userId: string,
  role: RideRole = "pilot",
) {
  return deleteAssignment(rideId, userId, role);
}

/**
 * Lifecycle phase 4 — a rider joins the Ride Roster. Two riders on one trip are
 * two rides for every statistic, so the roster is the counting unit.
 */
export async function bookRider(rideId: string, passengerId: string) {
  if (!(await findRideById(rideId))) throw new DomainError("unknownRide");
  const position = await countRosterEntries(rideId);
  return upsertRosterEntry(rideId, passengerId, position);
}

export const cancelBooking = (rideId: string, passengerId: string) =>
  deleteRosterEntry(rideId, passengerId);
