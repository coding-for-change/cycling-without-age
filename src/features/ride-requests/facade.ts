import { DomainError } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import type { $Enums } from "@/generated/prisma";
import { newRideRequest, type NewRideRequest } from "./schemas";
import {
  claimPendingRequest,
  closePendingRequest,
  countRideRequests,
  findDestinationsOfRequester,
  findOpenRequestsOf,
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

/** Links the scheduled ride and tells the requester, with both legs. */
export async function markScheduled(
  id: string,
  ride: { id: string; returnLegId: string | null },
  actorUserId: string | null,
) {
  const request = await findRideRequestScope(id);
  if (!request) throw new DomainError("unknownRequest");
  return transaction(async (tx, emit) => {
    const { count } = await linkRequestToRide(id, ride.id, tx);
    if (count !== 1) throw new DomainError("requestNotPending");
    await emit({
      type: "rideRequest.scheduled",
      requestId: id,
      chapterId: request.chapterId,
      actorUserId,
      requesterUserId: request.requesterUserId,
      rideId: ride.id,
      returnLegId: ride.returnLegId,
    });
  });
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

/** The Ride Request List: soonest first. */
export const listRequests = async (
  chapterIds: string[],
  status: $Enums.RideRequestStatus | null = "pending",
) => (chapterIds.length ? findRideRequests(chapterIds, status, LIST_MAX) : []);

export const listPending = (chapterIds: string[]) =>
  listRequests(chapterIds, "pending");

export const countPending = async (chapterIds: string[]) =>
  chapterIds.length ? countRideRequests(chapterIds, "pending") : 0;

/** An account's own requests: every open one, and those decided in the last month. */
export const listOfUser = (userId: string, now = new Date()) =>
  findRideRequestsOfRequester(
    userId,
    new Date(now.getTime() - RECENT_DAYS * DAY_MS),
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
