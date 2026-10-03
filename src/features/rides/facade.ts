import { DomainError } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import type { Prisma } from "@/generated/prisma";
import {
  cancelRideInput,
  rideDetailsPatch,
  rideInput,
  rideLogNote,
  rideTimes,
  slotWindow,
  trishawIdList,
  wallSlot,
  type CancelRideInput,
  type RideDetailsPatch,
  type RideInput,
  type RideRole,
  type RideTimes,
  type WallSlot,
} from "./schemas";
import {
  findLogOfRide,
  insertRideLogEntry,
  type RideLogRow,
} from "./services/log";
import {
  conflictsUnderLock,
  countFutureRidesWithTrishaws,
  deleteAssignment,
  deleteRideById,
  deleteRosterEntry,
  findAssignment,
  findLogNames,
  findLatestRideForPilot,
  findFinishableRideForPilot,
  findRideById,
  findRideDetail,
  findRideIdsWithTrishawFrom,
  findRideLegIds,
  findRideParticipants,
  findRidesForCalendarFeed,
  findRidesForPassengers,
  findRidesForPilot,
  findRidesInRange,
  findRidesOfTrishaw,
  findRosterEntry,
  insertAssignment,
  insertRide,
  insertRosterEntry,
  lockRides,
  nextRosterPosition,
  replaceRideTrishaws,
  updateRide,
  type FeedAudience,
  type PilotRideRow,
  type RideCalendarRow,
  type RideDetailRow,
  type RideFeedRow,
  type TrishawRideRow,
} from "./services/rides";

export type {
  FeedAudience,
  PilotRideRow,
  RideCalendarRow,
  RideDetailRow,
  RideFeedRow,
  RideLogRow,
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

export const getFinishableRideForPilot = (
  rideId: string,
  userId: string,
  now = new Date(),
) => findFinishableRideForPilot(rideId, userId, now);

export const latestRideForPilot = (userId: string, now = new Date()) =>
  findLatestRideForPilot(userId, now);

export const getRideDetail = (id: string) => findRideDetail(id);

const NAMED_IN_LOG = {
  userId: ["pilotAssigned", "pilotUnassigned"],
  passengerId: ["riderBooked", "riderRemoved"],
} as const;

const idIn = (entry: RideLogRow, key: keyof typeof NAMED_IN_LOG) =>
  (NAMED_IN_LOG[key] as readonly string[]).includes(entry.type) &&
  entry.payload &&
  typeof entry.payload === "object" &&
  !Array.isArray(entry.payload) &&
  typeof entry.payload[key] === "string"
    ? entry.payload[key]
    : null;

/**
 * The history keeps ids, never names, so deleting a person deletes their name
 * from every ride they were on. Names are looked up as the history is read;
 * someone who is gone reads as `name: null`.
 */
export async function listRideLog(rideId: string) {
  const entries = await findLogOfRide(rideId);
  const userIds = entries.flatMap((entry) => idIn(entry, "userId") ?? []);
  const passengerIds = entries.flatMap(
    (entry) => idIn(entry, "passengerId") ?? [],
  );
  const names = await findLogNames(
    [...new Set(userIds)],
    [...new Set(passengerIds)],
  );
  return entries.map((entry) => {
    const id = idIn(entry, "userId") ?? idIn(entry, "passengerId");
    return id === null
      ? entry
      : {
          ...entry,
          payload: {
            ...(entry.payload as Prisma.JsonObject),
            name: names.get(id) ?? null,
          },
        };
  });
}

/** Everyone a change to this ride concerns: its pilots and its riders' accounts. */
export async function listRideParticipants(rideId: string) {
  const ride = await findRideParticipants(rideId);
  if (!ride) return null;
  return {
    chapterId: ride.chapterId,
    pilotUserIds: [...new Set(ride.assignments.map((a) => a.userId))],
    riderAccountUserIds: [
      ...new Set(
        ride.roster.flatMap(({ passenger }) =>
          [passenger.managedByUserId, passenger.userId].filter(
            (id): id is string => Boolean(id),
          ),
        ),
      ),
    ],
  };
}

type Actor = string | null;
type Tx = Prisma.TransactionClient;

const iso = (date: Date) => date.toISOString();
const span = (window: { startsAt: Date; endsAt: Date }) => ({
  startsAt: iso(window.startsAt),
  endsAt: iso(window.endsAt),
});
/**
 * Ride writes read at READ COMMITTED. Under MySQL's default REPEATABLE READ the
 * snapshot is fixed by a transaction's first read, so a conflict check made
 * after waiting for a trishaw lock would still miss the booking that held it.
 */
const rideWrite = <T>(fn: Parameters<typeof transaction<T>>[0]) =>
  transaction(fn, { isolationLevel: "ReadCommitted" });

/**
 * Locks the ride, and the other leg of a round trip, before reading it: two
 * admins editing one ride queue up, and each reads what the other wrote.
 */
async function requireRide(id: string, tx: Tx) {
  const legs = await findRideLegIds(id, tx);
  if (!legs) throw new DomainError("unknownRide");
  await lockRides(
    tx,
    [legs.id, legs.returnLegOfId, legs.returnLeg?.id].filter(
      (leg): leg is string => Boolean(leg),
    ),
  );
  const ride = await findRideDetail(id, tx);
  if (!ride) throw new DomainError("unknownRide");
  return ride;
}

/** Only a ride that is still going ahead can be moved, staffed or booked. */
async function requireScheduled(id: string, tx: Tx) {
  const ride = await requireRide(id, tx);
  if (ride.status !== "scheduled") throw new DomainError("rideClosed");
  return ride;
}

async function reserveOrRefuse(
  tx: Tx,
  trishawIds: string[],
  windows: { startsAt: Date; endsAt: Date }[],
  exceptRideIds: string[] = [],
) {
  const conflicts = await conflictsUnderLock(
    tx,
    trishawIds,
    windows,
    exceptRideIds,
  );
  if (conflicts.length) throw new DomainError("trishawReserved");
}

/**
 * Scheduling commits the equipment: lifecycle phase 2C reserves the trishaw for
 * the ride's window, after which it is "no longer available to others". A
 * cancelled ride releases it. Whether the chapter may use the trishaw at all is
 * the fleet's question, asked by the use case before this runs.
 *
 * A round trip is two rows written together: both windows are checked under
 * the same lock, so the way there can never be booked without the way back.
 */
export async function scheduleRide(input: RideInput, actorUserId: Actor) {
  const { trishawIds, returnLeg, ...data } = rideInput.parse(input);
  return rideWrite(async (tx, emit) => {
    await reserveOrRefuse(tx, trishawIds, [
      data,
      ...(returnLeg ? [returnLeg] : []),
    ]);

    const ride = await insertRide(data, trishawIds, tx);
    await insertRideLogEntry(
      ride.id,
      actorUserId,
      "scheduled",
      { ...span(ride), trishawIds },
      tx,
    );

    const back = returnLeg
      ? await insertRide(
          {
            ...data,
            ...returnLeg,
            locationName: data.destinationName,
            locationAddress: data.destinationAddress,
            latitude: data.destinationLatitude,
            longitude: data.destinationLongitude,
            destinationName: data.locationName,
            destinationAddress: data.locationAddress,
            destinationLatitude: data.latitude,
            destinationLongitude: data.longitude,
            returnLegOfId: ride.id,
          },
          trishawIds,
          tx,
        )
      : null;
    if (back)
      await insertRideLogEntry(
        back.id,
        actorUserId,
        "scheduled",
        { ...span(back), trishawIds, returnLegOf: ride.id },
        tx,
      );

    await emit({
      type: "ride.scheduled",
      rideId: ride.id,
      chapterId: ride.chapterId,
      actorUserId,
      returnLegId: back?.id ?? null,
    });
    return { ...ride, returnLegId: back?.id ?? null };
  });
}

/**
 * Moving a ride takes its trishaws along, so the new window is checked under
 * the lock like a new booking. The two legs of a round trip keep their order.
 */
export async function rescheduleRide(
  id: string,
  times: RideTimes,
  actorUserId: Actor,
) {
  const next = rideTimes.parse(times);
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(id, tx);
    if (
      ride.startsAt.getTime() === next.startsAt.getTime() &&
      ride.endsAt.getTime() === next.endsAt.getTime()
    )
      return ride;

    if (ride.returnLeg && next.endsAt > ride.returnLeg.startsAt)
      throw new DomainError("legsOverlap");
    if (ride.returnLegOf && next.startsAt < ride.returnLegOf.endsAt)
      throw new DomainError("legsOverlap");

    await reserveOrRefuse(
      tx,
      ride.trishaws.map(({ trishaw }) => trishaw.id),
      [next],
      [id],
    );
    const updated = await updateRide(id, next, tx);
    await insertRideLogEntry(
      id,
      actorUserId,
      "rescheduled",
      { from: span(ride), to: span(next) },
      tx,
    );
    await emit({
      type: "ride.rescheduled",
      rideId: id,
      chapterId: ride.chapterId,
      actorUserId,
      changes: ["time"],
    });
    return updated;
  });
}

/** Wall-clock rescheduling, read in the ride's own chapter zone. */
export async function rescheduleRideAt(
  id: string,
  slot: WallSlot,
  actorUserId: Actor,
) {
  const ride = await findRideById(id);
  if (!ride) throw new DomainError("unknownRide");
  return rescheduleRide(
    id,
    slotWindow(wallSlot.parse(slot), ride.chapter.timeZone),
    actorUserId,
  );
}

const LOCATION_FIELDS = [
  "locationName",
  "locationAddress",
  "latitude",
  "longitude",
] as const;
const DESTINATION_FIELDS = [
  "destinationName",
  "destinationAddress",
  "destinationLatitude",
  "destinationLongitude",
] as const;
const DETAIL_FIELDS = [
  "model",
  ...LOCATION_FIELDS,
  ...DESTINATION_FIELDS,
  "requiredPilots",
  "note",
] as const;
type DetailField = (typeof DETAIL_FIELDS)[number];

const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

/**
 * Model, place, pilots needed and the note for pilots. A change of place is
 * news for whoever rides; the rest is only history.
 */
export async function updateRideDetails(
  id: string,
  patch: RideDetailsPatch,
  actorUserId: Actor,
) {
  const parsed = rideDetailsPatch.parse(patch);
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(id, tx);
    const leavingFunctional =
      parsed.model !== undefined &&
      parsed.model !== "functional" &&
      ride.model === "functional";
    if (
      parsed.model !== undefined &&
      parsed.model !== ride.model &&
      (ride.returnLeg || ride.returnLegOf)
    )
      throw new DomainError("partOfRoundTrip");

    const wanted: Partial<Record<DetailField, unknown>> = {
      ...parsed,
      ...(leavingFunctional
        ? Object.fromEntries(DESTINATION_FIELDS.map((field) => [field, null]))
        : {}),
    };
    const changed = DETAIL_FIELDS.filter(
      (field) =>
        wanted[field] !== undefined &&
        blankToNull(wanted[field]) !== (ride[field] ?? null),
    );
    if (!changed.length) return ride;

    const data = Object.fromEntries(
      changed.map((field) => [field, blankToNull(wanted[field])]),
    ) as Prisma.RideUncheckedUpdateInput;
    const updated = await updateRide(id, data, tx);

    const shown = changed.filter(
      (field) =>
        field !== "note" &&
        !field.endsWith("atitude") &&
        !field.endsWith("ongitude"),
    );
    await insertRideLogEntry(
      id,
      actorUserId,
      "edited",
      {
        fields: changed,
        from: Object.fromEntries(
          shown.map((field) => [field, ride[field] ?? null]),
        ),
        to: Object.fromEntries(
          shown.map((field) => [field, blankToNull(wanted[field])]),
        ),
      } as Prisma.InputJsonObject,
      tx,
    );

    const changes = [
      ...(changed.some((f) =>
        (LOCATION_FIELDS as readonly string[]).includes(f),
      )
        ? (["location"] as const)
        : []),
      ...(changed.some((f) =>
        (DESTINATION_FIELDS as readonly string[]).includes(f),
      )
        ? (["destination"] as const)
        : []),
    ];
    if (changes.length)
      await emit({
        type: "ride.rescheduled",
        rideId: id,
        chapterId: ride.chapterId,
        actorUserId,
        changes,
      });
    return updated;
  });
}

/**
 * Cancelling keeps the ride on the calendar — the glossary is explicit that a
 * cancellation "does not automatically remove the event from the Chapter
 * Operating Calendar" — but it releases the trishaws, because the conflict
 * check skips cancelled rides. Cancelling the way there takes the way back
 * with it unless the admin says otherwise.
 */
export async function cancelRide(
  id: string,
  input: CancelRideInput,
  actorUserId: Actor,
) {
  const { reasonCode, note, includeReturnLeg } = cancelRideInput.parse(input);
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(id, tx);
    if (ride.status === "cancelled") return { cancelledIds: [] as string[] };
    if (ride.status !== "scheduled") throw new DomainError("rideClosed");

    const ids = [
      ride.id,
      ...(includeReturnLeg && ride.returnLeg?.status === "scheduled"
        ? [ride.returnLeg.id]
        : []),
    ];
    const cancelledAt = new Date();
    for (const rideId of ids) {
      await updateRide(
        rideId,
        {
          status: "cancelled",
          cancelledAt,
          cancellationReasonCode: reasonCode,
          cancellationNote: note?.trim() || null,
          cancelledByUserId: actorUserId,
        },
        tx,
      );
      await insertRideLogEntry(
        rideId,
        actorUserId,
        "cancelled",
        { reasonCode, note: note?.trim() || null },
        tx,
      );
      await emit({
        type: "ride.cancelled",
        rideId,
        chapterId: ride.chapterId,
        actorUserId,
        reasonCode,
      });
    }
    return { cancelledIds: ids };
  });
}

/**
 * Only a cancelled ride can go, and going is what frees its calendar slot. Its
 * history goes with it, so the event is what remains of who deleted it.
 */
export async function deleteRide(id: string, actorUserId: Actor) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(id, tx);
    if (ride.status !== "cancelled") throw new DomainError("rideNotCancelled");
    await deleteRideById(id, tx);
    await emit({
      type: "ride.deleted",
      rideId: id,
      chapterId: ride.chapterId,
      actorUserId,
    });
    return ride;
  });
}

export async function setRideTrishaws(
  rideId: string,
  trishawIds: string[],
  actorUserId: Actor,
) {
  const ids = trishawIdList.parse(trishawIds);
  return rideWrite(async (tx) => {
    const ride = await requireScheduled(rideId, tx);
    const before = ride.trishaws.map(({ trishaw }) => trishaw);
    const kept = new Set(before.map((trishaw) => trishaw.id));
    if (before.length === ids.length && ids.every((id) => kept.has(id)))
      return ride;

    await reserveOrRefuse(tx, ids, [ride], [rideId]);
    const updated = await replaceRideTrishaws(rideId, ids, tx);
    const wanted = new Set(ids);
    await insertRideLogEntry(
      rideId,
      actorUserId,
      "trishawsChanged",
      {
        added: updated.trishaws
          .filter(({ trishaw }) => !kept.has(trishaw.id))
          .map(({ trishaw }) => ({ id: trishaw.id, name: trishaw.name })),
        removed: before
          .filter((trishaw) => !wanted.has(trishaw.id))
          .map((trishaw) => ({ id: trishaw.id, name: trishaw.name })),
      },
      tx,
    );
    return updated;
  });
}

/**
 * Lifecycle phase 3 — a volunteer commits to a role on this ride. The actor is
 * the admin who assigned them, or the pilot themself when they signed up.
 */
export async function assignVolunteer(
  rideId: string,
  userId: string,
  actorUserId: Actor,
  role: RideRole = "pilot",
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (await findAssignment(rideId, userId, role, tx)) return false;
    const self = actorUserId === userId;
    await insertAssignment(
      { rideId, userId, role, assignedByUserId: self ? null : actorUserId },
      tx,
    );
    await insertRideLogEntry(
      rideId,
      actorUserId,
      "pilotAssigned",
      { userId, role },
      tx,
    );
    await emit({
      type: "ride.pilotAssigned",
      rideId,
      chapterId: ride.chapterId,
      actorUserId,
      userId,
      self,
    });
    return true;
  });
}

export async function unassignVolunteer(
  rideId: string,
  userId: string,
  actorUserId: Actor,
  role: RideRole = "pilot",
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (!(await findAssignment(rideId, userId, role, tx))) return false;
    await deleteAssignment(rideId, userId, role, tx);
    await insertRideLogEntry(
      rideId,
      actorUserId,
      "pilotUnassigned",
      { userId, role },
      tx,
    );
    await emit({
      type: "ride.pilotUnassigned",
      rideId,
      chapterId: ride.chapterId,
      actorUserId,
      userId,
      self: actorUserId === userId,
    });
    return true;
  });
}

/**
 * Lifecycle phase 4 — a rider joins the Ride Roster. Two riders on one trip are
 * two rides for every statistic, so the roster is the counting unit.
 */
export async function bookRider(
  rideId: string,
  passengerId: string,
  actorUserId: Actor,
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (await findRosterEntry(rideId, passengerId, tx)) return false;
    await insertRosterEntry(
      {
        rideId,
        passengerId,
        position: await nextRosterPosition(rideId, tx),
        bookedByUserId: actorUserId,
      },
      tx,
    );
    await insertRideLogEntry(
      rideId,
      actorUserId,
      "riderBooked",
      { passengerId },
      tx,
    );
    await emit({
      type: "ride.riderBooked",
      rideId,
      chapterId: ride.chapterId,
      actorUserId,
      passengerId,
    });
    return true;
  });
}

export async function cancelBooking(
  rideId: string,
  passengerId: string,
  actorUserId: Actor,
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (!(await findRosterEntry(rideId, passengerId, tx))) return false;
    await deleteRosterEntry(rideId, passengerId, tx);
    await insertRideLogEntry(
      rideId,
      actorUserId,
      "riderRemoved",
      { passengerId },
      tx,
    );
    await emit({
      type: "ride.riderRemoved",
      rideId,
      chapterId: ride.chapterId,
      actorUserId,
      passengerId,
    });
    return true;
  });
}

/** A note in the ride's history. Unlike the note for pilots, it never changes. */
export async function addRideNote(
  rideId: string,
  text: string,
  actorUserId: string,
) {
  const note = rideLogNote.parse(text);
  if (!(await findRideById(rideId))) throw new DomainError("unknownRide");
  return insertRideLogEntry(rideId, actorUserId, "note", { text: note });
}
