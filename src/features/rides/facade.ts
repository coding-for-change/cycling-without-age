import { DomainError, mapping } from "@/lib/domain-error";
import { transaction, type DomainEvent } from "@/lib/events";
import type { FileReadRule } from "@/lib/access";
import type { $Enums, Prisma } from "@/generated/prisma";
import {
  PLEASURE_LIMITS,
  bookRiderInput,
  cancelRideInput,
  modelLimits,
  reorderRosterInput,
  rescheduleInput,
  rideListPageInput,
  ridePhotosInput,
  rideDetailsPatch,
  rideLogNote,
  rideModelIssues,
  shapedForModel,
  slotOf,
  slotWindow,
  trishawIdList,
  type CancelRideInput,
  type ReorderRosterInput,
  type RescheduleInput,
  type RideData,
  type RideDetailsPatch,
  type RideListPageInput,
  type RideModelIssue,
  type RideModelShape,
  type RidePhotosInput,
  type RideRole,
} from "./schemas";
import {
  countLogOfRide,
  findLogOfRide,
  insertRideLogEntries,
  insertRideLogEntry,
  type RideLogRow,
} from "./services/log";
import { findRidePhotoFile, findStoredFiles } from "./services/photos";
import {
  conflictsUnderLock,
  countFutureRidesWithTrishaws,
  deleteAssignment,
  deleteRideById,
  deleteRosterEntry,
  findLogNames,
  findLatestRideForPilot,
  findPastRidesForList,
  findReservations,
  findUpcomingRidesForList,
  findFinishableRideForPilot,
  findRideById,
  findRideDetail,
  findRideIdsWithTrishawFrom,
  findRideLegIds,
  findRideScope,
  findRidesForCalendarFeed,
  findRidesForPassengers,
  findRidesForPilot,
  findRidesInRange,
  findRidesOfTrishaw,
  insertAssignment,
  insertAssignments,
  insertRide,
  insertRosterEntries,
  insertRosterEntry,
  insertRosterEntryAt,
  lockRides,
  replaceRidePhotos,
  replaceRideTrishaws,
  updateRide,
  updateRosterPositions,
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

export const countRideLog = (rideId: string) => countLogOfRide(rideId);

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
export async function listRideLog(rideId: string, take = 200) {
  const entries = await findLogOfRide(rideId, take);
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

export const getRideScope = async (id: string) => {
  const ride = await findRideScope(id);
  return ride
    ? {
        id: ride.id,
        chapterId: ride.chapterId,
        trishawIds: ride.trishaws.map(({ trishawId }) => trishawId),
      }
    : null;
};
export type RideScope = NonNullable<Awaited<ReturnType<typeof getRideScope>>>;

export const bookedTrishawIds = async (
  trishawIds: string[],
  windows: { startsAt: Date; endsAt: Date }[],
  exceptRideIds: string[] = [],
) =>
  new Set(
    (await findReservations(trishawIds, windows, exceptRideIds)).map(
      ({ trishawId }) => trishawId,
    ),
  );

type Actor = string | null;
type Tx = Prisma.TransactionClient;
type Emit = Parameters<Parameters<typeof transaction>[0]>[1];
type RideEvent = Extract<DomainEvent, { rideId: string }>;
type RideEventBody<E = RideEvent> = E extends RideEvent
  ? Omit<E, "rideId" | "chapterId" | "actorUserId">
  : never;

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

async function record(
  tx: Tx,
  emit: Emit,
  ride: { id: string; chapterId: string },
  actorUserId: Actor,
  type: $Enums.RideLogType,
  payload: Prisma.InputJsonObject,
  event?: RideEventBody,
) {
  await insertRideLogEntry(ride.id, actorUserId, type, payload, tx);
  if (event)
    await emit({
      ...event,
      rideId: ride.id,
      chapterId: ride.chapterId,
      actorUserId,
    } as RideEvent);
}

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

const modelShapeOf = (ride: RideDetailRow): RideModelShape => ({
  ...ride,
  passengers: ride.roster.length,
  trishaws: ride.trishaws.length,
  pilots: ride.assignments.length,
  photos: ride.photos.length,
});

const issueKey = (issue: RideModelIssue) => `${issue.code}:${issue.path}`;

/**
 * An edit may not break a model rule the ride kept until now. A rule the ride
 * already broke does not block unrelated edits, or a ride missing two things
 * could never be fixed one field at a time.
 */
function refuseNewModelIssues(before: RideModelShape, after: RideModelShape) {
  const known = new Set(rideModelIssues(before).map(issueKey));
  const added = rideModelIssues(after).find(
    (issue) => !known.has(issueKey(issue)),
  );
  if (added) throw new DomainError(added.code);
}

/** One more rider or pilot, as the ride's model and numbers allow. */
function requireRoom(
  ride: RideDetailRow,
  seat: "passengers" | "pilots",
  taken: number,
) {
  const limit = modelLimits(ride.model, ride.capacity, ride.requiredPilots)[
    seat
  ];
  if (limit === null || taken < limit) return;
  if (ride.model === "pleasure") throw new DomainError("pleasureLimit");
  throw new DomainError(seat === "passengers" ? "rideFull" : "pilotsFull");
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
export async function scheduleRide(input: RideData, actorUserId: Actor) {
  const {
    trishawIds,
    returnLeg,
    passengerIds,
    pilotIds,
    photoFileIds,
    ...data
  } = shapedForModel(input);
  return rideWrite(async (tx, emit) => {
    await requireRidePhotos(photoFileIds, actorUserId, null, tx);
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
    if (photoFileIds.length) await attachPhotos(ride.id, photoFileIds, tx);

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
    for (const leg of back ? [ride, back] : [ride])
      await staffAndBook(leg, passengerIds, pilotIds, actorUserId, tx, emit);
    return { ...ride, returnLegId: back?.id ?? null };
  });
}

async function staffAndBook(
  ride: { id: string; chapterId: string },
  passengerIds: string[],
  pilotIds: string[],
  actorUserId: Actor,
  tx: Tx,
  emit: Emit,
) {
  if (passengerIds.length)
    await insertRosterEntries(ride.id, passengerIds, actorUserId, tx);
  if (pilotIds.length)
    await insertAssignments(ride.id, pilotIds, actorUserId, tx);
  if (!passengerIds.length && !pilotIds.length) return;

  await insertRideLogEntries(
    [
      ...passengerIds.map((passengerId) => ({
        type: "riderBooked" as const,
        payload: { passengerId },
      })),
      ...pilotIds.map((userId) => ({
        type: "pilotAssigned" as const,
        payload: { userId, role: "pilot" },
      })),
    ].map((entry) => ({ ...entry, rideId: ride.id, actorUserId })),
    tx,
  );
  const scope = { rideId: ride.id, chapterId: ride.chapterId, actorUserId };
  for (const passengerId of passengerIds)
    await emit({ type: "ride.riderBooked", ...scope, passengerId });
  for (const userId of pilotIds)
    await emit({
      type: "ride.pilotAssigned",
      ...scope,
      userId,
      self: actorUserId === userId,
    });
}

/**
 * A photo joins a ride only as a ride photo its uploader made, or as one the
 * ride already shows. A file of another kind, someone else's upload or another
 * ride's photo is refused.
 */
async function requireRidePhotos(
  fileIds: string[],
  actorUserId: Actor,
  rideId: string | null,
  tx: Tx,
) {
  if (!fileIds.length) return;
  const files = await findStoredFiles(fileIds, tx);
  const usable = files.filter(
    (file) =>
      file.kind === "ridePhoto" &&
      file.ridePhotos.every((photo) => photo.rideId === rideId) &&
      (file.uploadedByUserId === actorUserId ||
        (rideId !== null &&
          file.ridePhotos.some((photo) => photo.rideId === rideId))),
  );
  if (usable.length !== fileIds.length) throw new DomainError("invalidFile");
}

/**
 * A file sits on at most one ride, which the database enforces: two admins
 * racing the same upload onto two rides leave it on whichever wrote first.
 */
const attachPhotos = (rideId: string, fileIds: string[], tx: Tx) =>
  mapping(() => replaceRidePhotos(rideId, fileIds, tx), {
    unique: "invalidFile",
  });

/**
 * Moving a ride takes its trishaws along, so the new window is checked under
 * the lock like a new booking. A wall-clock slot is read in the ride's own
 * chapter zone, and a slot field left out keeps the ride's value as read under
 * the lock, so two quick edits — the start, then the length — never undo each
 * other.
 *
 * Moving the way there of a round trip moves a scheduled way back by as much
 * as the way there's end moved, so the time at the destination stays the same
 * and the doctor's appointment that moved a day moves both rides a day. A
 * cancelled way back stays where it is and is no obstacle. The way back moves
 * on its own, but never to before the way there arrives.
 */
export async function rescheduleRide(
  id: string,
  input: RescheduleInput,
  actorUserId: Actor,
) {
  const parsed = rescheduleInput.parse(input);
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(id, tx);
    const zone = ride.chapter.timeZone;
    const next =
      "startsAt" in parsed
        ? parsed
        : slotWindow({ ...slotOf(ride, zone), ...parsed }, zone);
    if (
      ride.startsAt.getTime() === next.startsAt.getTime() &&
      ride.endsAt.getTime() === next.endsAt.getTime()
    )
      return { ride, changed: false, movedReturnLeg: false };

    if (
      ride.returnLegOf?.status === "scheduled" &&
      next.startsAt < ride.returnLegOf.endsAt
    )
      throw new DomainError("legsOverlap");

    const back =
      ride.returnLeg?.status === "scheduled"
        ? await findRideDetail(ride.returnLeg.id, tx)
        : null;
    const shift = next.endsAt.getTime() - ride.endsAt.getTime();
    const moves = [
      { leg: ride, to: next },
      ...(back && shift !== 0
        ? [
            {
              leg: back,
              to: {
                startsAt: new Date(back.startsAt.getTime() + shift),
                endsAt: new Date(back.endsAt.getTime() + shift),
              },
            },
          ]
        : []),
    ];
    const movingIds = moves.map(({ leg }) => leg.id);

    for (const { leg, to } of moves)
      await reserveOrRefuse(
        tx,
        leg.trishaws.map(({ trishaw }) => trishaw.id),
        [to],
        movingIds,
      );

    let updated = null;
    for (const { leg, to } of moves) {
      const row = await updateRide(leg.id, to, tx);
      updated ??= row;
      await record(
        tx,
        emit,
        leg,
        actorUserId,
        "rescheduled",
        {
          from: span(leg),
          to: span(to),
          ...(leg.id === id ? {} : { withLegOf: id }),
        },
        { type: "ride.rescheduled", changes: ["time"] },
      );
    }
    return { ride: updated!, changed: true, movedReturnLeg: moves.length > 1 };
  });
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
  "title",
  "description",
  "capacity",
  ...LOCATION_FIELDS,
  ...DESTINATION_FIELDS,
  "requiredPilots",
  "note",
] as const;
const UNSHOWN_FIELDS: readonly string[] = ["note", "description"];
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

    const model = parsed.model ?? ride.model;
    const wanted: Partial<Record<DetailField, unknown>> = {
      ...parsed,
      ...(model === "pleasure" && parsed.requiredPilots === undefined
        ? { requiredPilots: PLEASURE_LIMITS.pilots }
        : {}),
      ...(leavingFunctional
        ? Object.fromEntries(DESTINATION_FIELDS.map((field) => [field, null]))
        : {}),
    };
    const current = modelShapeOf(ride);
    refuseNewModelIssues(current, {
      ...current,
      ...Object.fromEntries(
        Object.entries(wanted)
          .filter(([, value]) => value !== undefined)
          .map(([field, value]) => [field, blankToNull(value)]),
      ),
    });

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
        !UNSHOWN_FIELDS.includes(field) &&
        !field.endsWith("atitude") &&
        !field.endsWith("ongitude"),
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
    await record(
      tx,
      emit,
      ride,
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
      changes.length ? { type: "ride.rescheduled", changes } : undefined,
    );
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
      await record(
        tx,
        emit,
        { id: rideId, chapterId: ride.chapterId },
        actorUserId,
        "cancelled",
        { reasonCode, note: note?.trim() || null },
        { type: "ride.cancelled", reasonCode },
      );
    }
    return { cancelledIds: ids };
  });
}

/**
 * Only a cancelled ride can go, and going is what frees its calendar slot. Its
 * history goes with it, so the event is what remains of who deleted it. A
 * round trip goes as a whole: a cancelled other leg goes too, and one still
 * going ahead has to be cancelled first, so no leg is ever left behind with
 * its places swapped and nothing to return from. A completed other leg stays.
 */
export async function deleteRide(id: string, actorUserId: Actor) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(id, tx);
    if (ride.status !== "cancelled") throw new DomainError("rideNotCancelled");
    const other = ride.returnLeg ?? ride.returnLegOf;
    if (other?.status === "scheduled")
      throw new DomainError("otherLegScheduled");

    const ids = [id, ...(other?.status === "cancelled" ? [other.id] : [])];
    for (const rideId of ids) {
      await deleteRideById(rideId, tx);
      await emit({
        type: "ride.deleted",
        rideId,
        chapterId: ride.chapterId,
        actorUserId,
      });
    }
    return { deletedIds: ids };
  });
}

export async function setRideTrishaws(
  rideId: string,
  trishawIds: string[],
  actorUserId: Actor,
) {
  const ids = trishawIdList.parse(trishawIds);
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    const before = ride.trishaws.map(({ trishaw }) => trishaw);
    const kept = new Set(before.map((trishaw) => trishaw.id));
    if (before.length === ids.length && ids.every((id) => kept.has(id)))
      return ride;
    const current = modelShapeOf(ride);
    refuseNewModelIssues(current, { ...current, trishaws: ids.length });

    await reserveOrRefuse(tx, ids, [ride], [rideId]);
    const updated = await replaceRideTrishaws(rideId, ids, tx);
    const wanted = new Set(ids);
    await record(tx, emit, ride, actorUserId, "trishawsChanged", {
      added: updated.trishaws
        .filter(({ trishaw }) => !kept.has(trishaw.id))
        .map(({ trishaw }) => ({ id: trishaw.id, name: trishaw.name })),
      removed: before
        .filter((trishaw) => !wanted.has(trishaw.id))
        .map((trishaw) => ({ id: trishaw.id, name: trishaw.name })),
    });
    return updated;
  });
}

const isAssigned = (ride: RideDetailRow, userId: string, role: RideRole) =>
  ride.assignments.some(
    (assignment) => assignment.user.id === userId && assignment.role === role,
  );

const isBooked = (ride: RideDetailRow, passengerId: string) =>
  ride.roster.some(({ passenger }) => passenger.id === passengerId);

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
    if (isAssigned(ride, userId, role)) return false;
    requireRoom(ride, "pilots", ride.assignments.length);
    const self = actorUserId === userId;
    await insertAssignment(
      { rideId, userId, role, assignedByUserId: self ? null : actorUserId },
      tx,
    );
    await record(
      tx,
      emit,
      ride,
      actorUserId,
      "pilotAssigned",
      { userId, role },
      { type: "ride.pilotAssigned", userId, self },
    );
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
    if (!isAssigned(ride, userId, role)) return false;
    await deleteAssignment(rideId, userId, role, tx);
    await record(
      tx,
      emit,
      ride,
      actorUserId,
      "pilotUnassigned",
      { userId, role },
      { type: "ride.pilotUnassigned", userId, self: actorUserId === userId },
    );
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
  position?: number,
) {
  const at = bookRiderInput.shape.position.parse(position);
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (isBooked(ride, passengerId)) return false;
    requireRoom(ride, "passengers", ride.roster.length);

    const before = at === undefined ? undefined : ride.roster[at];
    const entry = {
      rideId,
      passengerId,
      bookedByUserId: actorUserId,
    };
    if (before)
      await insertRosterEntryAt({ ...entry, position: before.position }, tx);
    else
      await insertRosterEntry(
        {
          ...entry,
          position: Math.max(-1, ...ride.roster.map((e) => e.position)) + 1,
        },
        tx,
      );
    await record(
      tx,
      emit,
      ride,
      actorUserId,
      "riderBooked",
      { passengerId },
      { type: "ride.riderBooked", passengerId },
    );
    return true;
  });
}

export async function reorderRoster(
  input: ReorderRosterInput,
  actorUserId: Actor,
) {
  const { rideId, passengerIds } = reorderRosterInput.parse(input);
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    const current = ride.roster.map(({ passenger }) => passenger.id);
    const known = new Set(current);
    if (
      current.length !== passengerIds.length ||
      passengerIds.some((id) => !known.has(id))
    )
      throw new DomainError("rosterChanged");
    if (current.every((id, index) => id === passengerIds[index])) return false;

    await updateRosterPositions(rideId, passengerIds, tx);
    await record(tx, emit, ride, actorUserId, "rosterReordered", {
      from: current,
      to: passengerIds,
    });
    return true;
  });
}

export async function setRidePhotos(
  input: RidePhotosInput,
  actorUserId: Actor,
) {
  const { rideId, fileIds } = ridePhotosInput.parse(input);
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(rideId, tx);
    if (fileIds.length && ride.model !== "event")
      throw new DomainError("photosEventOnly");
    const before = ride.photos.map((photo) => photo.fileId);
    if (
      before.length === fileIds.length &&
      before.every((id, index) => id === fileIds[index])
    )
      return false;

    await requireRidePhotos(fileIds, actorUserId, rideId, tx);
    await attachPhotos(rideId, fileIds, tx);
    await record(tx, emit, ride, actorUserId, "edited", {
      fields: ["photos"],
    });
    return true;
  });
}

/**
 * Null for any file that is not a ride photo. A photo on a ride is for the
 * admins of that ride's chapter; one not on a ride yet only for its uploader.
 */
export async function photoReadRule(fileId: string) {
  const file = await findRidePhotoFile(fileId);
  if (!file || file.kind !== "ridePhoto") return null;
  const ride = file.ridePhotos[0]?.ride;
  const rule: FileReadRule = ride
    ? {
        kind: "members",
        chapterIds: [ride.chapterId],
        roles: ["admin"],
        admins: {
          chapters: [
            { chapterId: ride.chapterId, countryId: ride.chapter.countryId },
          ],
          countryIds: [],
        },
      }
    : { kind: "uploader", userId: file.uploadedByUserId };
  return { file, rule };
}

const PAST_ON_LIST = 3;

const encodeCursor = (ride: { startsAt: Date; id: string }) =>
  `${ride.startsAt.getTime()}.${ride.id}`;

const decodeCursor = (cursor: string | null | undefined) => {
  const match = cursor?.match(/^(\d{1,15})\.([A-Za-z0-9_-]{1,64})$/);
  return match ? { startsAt: new Date(Number(match[1])), id: match[2] } : null;
};

export async function listRidesForList(
  input: RideListPageInput,
  now = new Date(),
) {
  const { chapterIds, cursor, limit } = rideListPageInput.parse(input);
  if (!chapterIds.length)
    return { past: [], rides: [], nextCursor: null as string | null };
  const after = decodeCursor(cursor);
  const [past, upcoming] = await Promise.all([
    cursor ? [] : findPastRidesForList(chapterIds, now, PAST_ON_LIST),
    findUpcomingRidesForList(chapterIds, now, after, limit + 1),
  ]);
  const page = upcoming.slice(0, limit);
  return {
    past: [...past].reverse(),
    rides: page,
    nextCursor:
      upcoming.length > limit ? encodeCursor(page[page.length - 1]) : null,
  };
}

export async function cancelBooking(
  rideId: string,
  passengerId: string,
  actorUserId: Actor,
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (!isBooked(ride, passengerId)) return false;
    await deleteRosterEntry(rideId, passengerId, tx);
    await record(
      tx,
      emit,
      ride,
      actorUserId,
      "riderRemoved",
      { passengerId },
      { type: "ride.riderRemoved", passengerId },
    );
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
  if (!(await findRideScope(rideId))) throw new DomainError("unknownRide");
  return insertRideLogEntry(rideId, actorUserId, "note", { text: note });
}
