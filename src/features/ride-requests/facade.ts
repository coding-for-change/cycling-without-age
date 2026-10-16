import { DomainError } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import type { $Enums } from "@/generated/prisma";
import { newRideRequest, type NewRideRequest } from "./schemas";
import {
  claimPendingRequest,
  closePendingRequest,
  countOpenRequestsOfRequester,
  countOpenRequestsOverlapping,
  countRideRequests,
  findDestinationsOfRequester,
  findOpenRequestsOf,
  findOpenRequestsOfRequesterWith,
  removeRequestRider,
  setRequester,
  findRideRequest,
  findRideRequestScope,
  findRideRequests,
  findRideRequestsOfRequester,
  insertRideRequest,
  linkRequestToRide,
  releaseClaimedRequest,
  type RideRequestRecord,
} from "./services/ride-requests";

export type RideRequestRow = RideRequestRecord;

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 30;
const LIST_MAX = 200;
const OWN_MAX = 50;
const DESTINATIONS_MAX = 20;

/** Open requests one account may have waiting at once. */
export const OPEN_REQUESTS_MAX = 5;

/**
 * One request per rider and window: a rider already asked for in an
 * overlapping window cannot be asked for again until that one is decided,
 * and an account has at most a few requests waiting at once.
 */
export async function assertCanAsk(
  requesterUserId: string,
  passengerIds: string[],
  window: { startsAt: Date; endsAt: Date },
  now = new Date(),
) {
  const [overlapping, open] = await Promise.all([
    countOpenRequestsOverlapping(passengerIds, window),
    countOpenRequestsOfRequester(requesterUserId, now),
  ]);
  if (overlapping > 0) throw new DomainError("alreadyRequested");
  if (open >= OPEN_REQUESTS_MAX) throw new DomainError("tooManyRequests");
}

/**
 * Lifecycle 1C: the request is written with its riders in one transaction.
 * A chapter that schedules automatically announces it only once it is clear
 * that no ride could be made of it (`announce`), so nobody is asked to look
 * at a request that has already become a ride.
 */
export async function submit(
  input: NewRideRequest,
  { announce = true }: { announce?: boolean } = {},
) {
  const { passengerIds, ...data } = newRideRequest.parse(input);
  return transaction(async (tx, emit) => {
    const request = await insertRideRequest(data, passengerIds, tx);
    if (announce)
      await emit({
        type: "rideRequest.submitted",
        requestId: request.id,
        chapterId: request.chapterId,
        actorUserId: data.requesterUserId,
      });
    return request;
  });
}

/** Re-lists a request automatic scheduling could not place, for an admin to decide. */
export async function announce(id: string) {
  const request = await findRideRequestScope(id);
  if (!request || request.status !== "pending" || !request.requesterUserId)
    return;
  await transaction(async (_tx, emit) => {
    await emit({
      type: "rideRequest.submitted",
      requestId: request.id,
      chapterId: request.chapterId,
      actorUserId: request.requesterUserId!,
    });
  });
}

export const getRequest = (id: string) => findRideRequest(id);

export const getRequestScope = (id: string) => findRideRequestScope(id);

export async function requirePending(id: string) {
  const request = await findRideRequest(id);
  if (!request) throw new DomainError("unknownRequest");
  if (request.status !== "pending") throw new DomainError("requestNotPending");
  return request;
}

/**
 * Takes a pending request off the list before its ride is written, so two
 * admins scheduling it at once cannot make two rides of it: the second finds
 * it no longer pending.
 */
export async function claim(
  id: string,
  actorUserId: string | null,
  now = new Date(),
) {
  const { count } = await claimPendingRequest(id, actorUserId, now);
  if (count !== 1) throw new DomainError("requestNotPending");
}

/** Puts a claimed request back when its ride could not be written. */
export const release = (id: string) => releaseClaimedRequest(id);

/**
 * Links the scheduled ride and tells the requester, with both legs, once.
 * The scheduling use case links right after the ride is written, and the
 * ride's own `ride.scheduled` listener links again in case that step never
 * ran; whichever comes second finds the link in place and does nothing.
 */
export async function markScheduled(
  id: string,
  ride: { id: string; returnLegId: string | null },
  actorUserId: string | null,
) {
  const request = await findRideRequestScope(id);
  if (!request) throw new DomainError("unknownRequest");
  if (request.rideId === ride.id) return;
  const linked = await transaction(async (tx, emit) => {
    const { count } = await linkRequestToRide(id, ride.id, tx);
    if (count !== 1) return false;
    await emit({
      type: "rideRequest.scheduled",
      requestId: id,
      chapterId: request.chapterId,
      actorUserId,
      requesterUserId: request.requesterUserId,
      rideId: ride.id,
      returnLegId: ride.returnLegId,
    });
    return true;
  });
  if (linked || (await findRideRequestScope(id))?.rideId === ride.id) return;
  throw new DomainError("requestNotPending");
}

export async function decline(
  id: string,
  actorUserId: string,
  note: string | null,
  now = new Date(),
) {
  const request = await findRideRequestScope(id);
  if (!request) throw new DomainError("unknownRequest");
  return transaction(async (tx, emit) => {
    const { count } = await closePendingRequest(
      id,
      {
        status: "declined",
        decidedByUserId: actorUserId,
        decidedAt: now,
        decisionNote: note,
      },
      null,
      tx,
    );
    if (count !== 1) throw new DomainError("requestNotPending");
    await emit({
      type: "rideRequest.declined",
      requestId: id,
      chapterId: request.chapterId,
      actorUserId,
      requesterUserId: request.requesterUserId,
    });
  });
}

/**
 * Only the account that sent a request can take it back, and only while the
 * chapter has not decided. Someone else's request reads as a missing one.
 */
export async function withdraw(id: string, userId: string, now = new Date()) {
  const request = await findRideRequestScope(id);
  if (!request || request.requesterUserId !== userId)
    throw new DomainError("unknownRequest");
  if (request.status !== "pending") throw new DomainError("requestNotPending");
  return transaction(async (tx, emit) => {
    const { count } = await closePendingRequest(
      id,
      { status: "withdrawn", decidedByUserId: userId, decidedAt: now },
      userId,
      tx,
    );
    if (count !== 1) throw new DomainError("requestNotPending");
    await emit({
      type: "rideRequest.withdrawn",
      requestId: id,
      chapterId: request.chapterId,
      actorUserId: userId,
    });
  });
}

/**
 * Closes the open requests nobody can follow up any more: every request an
 * account sent, when the account goes, and every request whose riders are
 * all being removed. A request that still has another rider stays open.
 */
export async function withdrawOpenRequests(
  {
    requesterUserId,
    passengerIds = [],
  }: { requesterUserId?: string; passengerIds?: string[] },
  actorUserId: string,
  now = new Date(),
) {
  if (!requesterUserId && !passengerIds.length) return 0;
  const leaving = new Set(passengerIds);
  const open = (
    await findOpenRequestsOf({ requesterUserId, passengerIds })
  ).filter(
    (request) =>
      (requesterUserId && request.requesterUserId === requesterUserId) ||
      request.passengers.every(({ passengerId }) => leaving.has(passengerId)),
  );
  for (const request of open)
    await transaction(async (tx, emit) => {
      const { count } = await closePendingRequest(
        request.id,
        { status: "withdrawn", decidedByUserId: actorUserId, decidedAt: now },
        null,
        tx,
      );
      if (count !== 1) return;
      await emit({
        type: "rideRequest.withdrawn",
        requestId: request.id,
        chapterId: request.chapterId,
        actorUserId,
      });
    });
  return open.length;
}

/**
 * A rider handed to another account takes their open requests along: one
 * that asked for this rider alone now belongs to the new manager, who hears
 * how it ends; one shared with the old manager's other riders goes on without
 * this rider. The old manager is told nothing more about them.
 */
export async function handOverOpenRequests(
  passengerId: string,
  fromUserId: string,
  toUserId: string,
) {
  const open = await findOpenRequestsOfRequesterWith(fromUserId, passengerId);
  for (const request of open)
    if (request.passengers.length === 1)
      await setRequester(request.id, toUserId);
    else await removeRequestRider(request.id, passengerId);
  return open.length;
}

/**
 * A request still pending once the window it asked for has passed lapsed:
 * nobody answered in time. It drops off the open list and the counts, but
 * stays readable, and an admin may still schedule it for another time.
 */
export const lapsed = (
  request: { status: string; requestedEndsAt: Date },
  now = new Date(),
) => request.status === "pending" && request.requestedEndsAt <= now;

/**
 * A request withdrawn by anyone but the one who asked was closed: a rider
 * or the requester left, and nobody took it back on purpose.
 */
export const closed = (request: {
  status: string;
  requesterUserId: string | null;
  decidedByUserId: string | null;
}) =>
  request.status === "withdrawn" &&
  (request.requesterUserId === null ||
    request.decidedByUserId !== request.requesterUserId);

/**
 * The Ride Request List: the open ones soonest first, without lapsed ones;
 * any other view latest first, so a long history shows its recent end.
 */
export const listRequests = async (
  chapterIds: string[],
  status: $Enums.RideRequestStatus | null = "pending",
  now = new Date(),
) =>
  chapterIds.length
    ? findRideRequests(
        chapterIds,
        status,
        LIST_MAX,
        status === "pending" ? now : null,
      )
    : [];

export const listPending = (chapterIds: string[], now = new Date()) =>
  listRequests(chapterIds, "pending", now);

export const countPending = async (chapterIds: string[], now = new Date()) =>
  chapterIds.length ? countRideRequests(chapterIds, "pending", now) : 0;

/** An account's own requests: every open one, and those decided in the last month. */
/** The account's requests still waiting, and those decided lately. */
export const listOfUser = (userId: string, now = new Date()) =>
  findRideRequestsOfRequester(
    userId,
    { since: new Date(now.getTime() - RECENT_DAYS * DAY_MS), now },
    OWN_MAX,
  );

/** Places this account asked to be taken to before, newest first, once each. */
export async function previousDestinations(userId: string) {
  const rows = await findDestinationsOfRequester(userId, DESTINATIONS_MAX);
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const key = `${row.destinationName}|${row.destinationAddress ?? ""}`;
    if (!row.destinationName || seen.has(key)) return [];
    seen.add(key);
    return [
      {
        name: row.destinationName,
        address: row.destinationAddress,
        latitude: row.destinationLatitude,
        longitude: row.destinationLongitude,
      },
    ];
  });
}
