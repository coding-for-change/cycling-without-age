import { DomainError, mapping } from "@/lib/domain-error";
import { transaction, type DomainEvent } from "@/lib/events";
import type { FileReadRule } from "@/lib/access";
import { currencyOfRegion } from "@/lib/countries";
import type { $Enums, Prisma } from "@/generated/prisma";
import {
  CHECK_IN_LEAD_MINUTES,
  OPEN_RIDES_DAYS,
  PLEASURE_LIMITS,
  bookRiderInput,
  debriefInput,
  walkUpInput,
  type DebriefInput,
  type WalkUpInput,
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
  countPastRidesOfPilot,
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
  findPassengerRidesOn,
  findPilotRidesOn,
  FINISH_WINDOW_MS,
  findStillPiloting,
  findRideFacts,
  findRideForPassengers,
  findRideForPilot,
  findRideIdForPassengers,
  findRideIdForPilot,
  findRideParticipants,
  findAnnouncedEvent,
  findAnnouncedEvents,
  findBookingsOn,
  findOpenRide,
  findOpenRidesFor,
  findChaptersWithUncheckedRides,
  findStaffingCandidates,
  clearStaffingChecksOfPilot,
  deleteRosterEntryById,
  findChaptersWithRidesDue,
  findDebrief,
  findDebriefsOfRide,
  findEntryNames,
  findRideCountryCode,
  findRidesDue,
  insertWalkUp,
  updateAssignmentAttendance,
  updateRosterAttendance,
  updateRosterEntry,
  upsertDebrief,
  type RideDebriefRow,
  type RideMarker,
  type AnnouncedEventRow,
  type FeedAudience,
  type OpenRideQueryRow,
  type RideCursor,
  type PassengerRideDetailRow,
  type PassengerRideRow,
  type PilotRideDetailRow,
  type PilotRideRow,
  type RideCalendarRow,
  type RideDetailRow,
  type RideFeedRow,
  type TrishawRideRow,
} from "./services/rides";
import {
  countActiveRiders,
  findActivePilots,
  findActivityBuckets,
  findChapterTallies,
  findEarliestRideStart,
  findPilotTallies,
  findRiderCounts,
  findRiderTallies,
  type TallyFactRow,
} from "./services/report-facts";
import {
  tallies,
  type ActivityBucketRow,
  type ActivityFacts,
  type PilotMembership,
  type ReportTally,
} from "./report";
import type { ReportScope } from "./report-zones";

export type {
  AnnouncedEventRow,
  FeedAudience,
  PassengerRideDetailRow,
  PassengerRideRow,
  PilotRideDetailRow,
  PilotRideRow,
  RideCalendarRow,
  RideDetailRow,
  RideFeedRow,
  RideLogRow,
  TrishawRideRow,
};

export const listRidesInRange = async (
  chapterIds: string[],
  from: Date,
  to: Date,
) =>
  chapterIds.length
    ? withPilotStanding(await findRidesInRange(chapterIds, from, to))
    : [];

export const listRidesForPilot = async (userId: string, from: Date, to: Date) =>
  withActiveCrew(await findRidesForPilot(userId, from, to));

export const listRidesForPassengers = async (
  passengerIds: string[],
  from: Date,
  to: Date,
) =>
  passengerIds.length
    ? withActiveCrew(await findRidesForPassengers(passengerIds, from, to))
    : [];

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

const UPCOMING_ON_PAGE = 50;
const PAST_ON_PAGE = 20;

type Crewed = {
  chapterId: string;
  assignments: { user: { id: string } }[];
};

/**
 * Members see only the crew still piloting in the ride's chapter: a co-pilot
 * who was demoted or left keeps their assignment row, but is no longer
 * riding along as far as anyone on the ride is told.
 */
async function withActiveCrew<T extends Crewed>(rows: T[]): Promise<T[]> {
  const userIds = [
    ...new Set(rows.flatMap((row) => row.assignments.map((a) => a.user.id))),
  ];
  if (!userIds.length) return rows;
  const active = await findStillPiloting(
    [...new Set(rows.map((row) => row.chapterId))],
    userIds,
  );
  return rows.map((row) => ({
    ...row,
    assignments: row.assignments.filter((a) =>
      active.has(`${row.chapterId}:${a.user.id}`),
    ),
  }));
}

const withActiveCrewOf = async <T extends Crewed>(row: T | null) =>
  row ? (await withActiveCrew([row]))[0] : null;

/**
 * Admins still see a pilot who was demoted or left on the ride, so they can
 * take them off, but that seat counts as empty — as it does for signing up
 * and for the staffing check.
 */
type WithStanding<T extends Crewed> = Omit<T, "assignments"> & {
  assignments: (T["assignments"][number] & { stillPiloting: boolean })[];
};

async function withPilotStanding<T extends Crewed>(
  rows: T[],
): Promise<WithStanding<T>[]> {
  const userIds = [
    ...new Set(rows.flatMap((row) => row.assignments.map((a) => a.user.id))),
  ];
  const active = userIds.length
    ? await findStillPiloting(
        [...new Set(rows.map((row) => row.chapterId))],
        userIds,
      )
    : new Set<string>();
  return rows.map((row) => ({
    ...row,
    assignments: row.assignments.map((a) => ({
      ...a,
      stillPiloting: active.has(`${row.chapterId}:${a.user.id}`),
    })),
  }));
}

export async function listPilotRides(userId: string, now = new Date()) {
  const [upcoming, past] = await Promise.all([
    findPilotRidesOn(userId, now, "upcoming", UPCOMING_ON_PAGE).then(
      withActiveCrew,
    ),
    findPilotRidesOn(userId, now, "past", PAST_ON_PAGE).then(withActiveCrew),
  ]);
  return { upcoming, past };
}

export async function listPassengerRides(
  passengerIds: string[],
  now = new Date(),
) {
  if (!passengerIds.length) return { upcoming: [], past: [] };
  const [upcoming, past] = await Promise.all([
    findPassengerRidesOn(passengerIds, now, "upcoming", UPCOMING_ON_PAGE).then(
      withActiveCrew,
    ),
    findPassengerRidesOn(passengerIds, now, "past", PAST_ON_PAGE).then(
      withActiveCrew,
    ),
  ]);
  return { upcoming, past };
}

export const getRideFacts = (rideId: string) => findRideFacts(rideId);

export const pilotCanOpen = async (rideId: string, userId: string) =>
  (await findRideIdForPilot(rideId, userId)) !== null;

export const passengersCanOpen = async (
  rideId: string,
  passengerIds: string[],
) =>
  passengerIds.length > 0 &&
  (await findRideIdForPassengers(rideId, passengerIds)) !== null;

/**
 * The finish page shows a storage access code, so a ride can be finished
 * from its start until a day after it ended — the same window
 * `getFinishableRideForPilot` reads under.
 */
export const isFinishable = (
  ride: { status: string; startsAt: Date; endsAt: Date },
  now = new Date(),
) =>
  ride.status !== "cancelled" &&
  ride.startsAt <= now &&
  ride.endsAt.getTime() >= now.getTime() - FINISH_WINDOW_MS;

/** Only a pilot assigned to the ride, and still a pilot in its chapter. */
export const getRideForPilot = async (rideId: string, userId: string) =>
  withActiveCrewOf(await findRideForPilot(rideId, userId));

/** Only a ride one of these riders is on, showing only these riders. */
export const getRideForPassengers = async (
  rideId: string,
  passengerIds: string[],
) =>
  passengerIds.length
    ? withActiveCrewOf(await findRideForPassengers(rideId, passengerIds))
    : null;

export async function listRideParticipants(rideId: string) {
  const ride = await findRideParticipants(rideId);
  if (!ride) return null;
  return {
    chapterId: ride.chapterId,
    pilotUserIds: [...new Set(ride.assignments.map((a) => a.userId))],
    riderAccountUserIds: [
      ...new Set(
        ride.roster.flatMap(({ passenger }) =>
          passenger
            ? [passenger.managedByUserId, passenger.userId].filter(
                (id): id is string => Boolean(id),
              )
            : [],
        ),
      ),
    ],
  };
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

export const getFinishableRideForPilot = (
  rideId: string,
  userId: string,
  now = new Date(),
) => findFinishableRideForPilot(rideId, userId, now);

export const hasPilotedRide = async (userId: string, now = new Date()) =>
  (await countPastRidesOfPilot(userId, now)) > 0;

export const latestRideForPilot = (userId: string, now = new Date()) =>
  findLatestRideForPilot(userId, now);

export const getRideDetail = async (id: string) => {
  const ride = await findRideDetail(id);
  return ride ? (await withPilotStanding([ride]))[0] : null;
};

export const countRideLog = (rideId: string) => countLogOfRide(rideId);

const NAMED_IN_LOG = {
  userId: ["pilotAssigned", "pilotUnassigned", "pilotNoShow"],
  passengerId: [
    "riderBooked",
    "riderRemoved",
    "seatConfirmed",
    "seatCancelled",
  ],
  entryId: ["checkedIn", "checkInUndone", "walkUpAdded"],
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
  const entryIds = entries.flatMap((entry) => idIn(entry, "entryId") ?? []);
  const [names, entryNames] = await Promise.all([
    findLogNames([...new Set(userIds)], [...new Set(passengerIds)]),
    findEntryNames([...new Set(entryIds)]),
  ]);
  return entries.map((entry) => {
    const id = idIn(entry, "userId") ?? idIn(entry, "passengerId");
    const entryId = idIn(entry, "entryId");
    if (id === null && entryId === null) return entry;
    return {
      ...entry,
      payload: {
        ...(entry.payload as Prisma.JsonObject),
        name: (id ? names.get(id) : entryNames.get(entryId!)) ?? null,
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
type RidePair = Extract<DomainEvent, { type: "ride.cancelled" }>["pair"];
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

type RosterEntry = RideDetailRow["roster"][number];

const seatedOn = (ride: { roster: RosterEntry[] }) =>
  ride.roster.filter((entry) => entry.attendance !== "cancelled");

const entryOf = (ride: RideDetailRow, passengerId: string) =>
  ride.roster.find(({ passenger }) => passenger?.id === passengerId);

const modelShapeOf = async (
  ride: RideDetailRow,
  tx: Tx,
): Promise<RideModelShape> => ({
  ...ride,
  passengers: seatedOn(ride).length,
  trishaws: ride.trishaws.length,
  pilots: await pilotsOn(ride, tx),
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
 * A ride scheduled already inside its chapter's staffing window counts as
 * checked: the admin scheduling it sees what it is short of, and the sweep
 * would only repeat it to them minutes later.
 *
 * A round trip is two rows written together: both windows are checked under
 * the same lock, so the way there can never be booked without the way back.
 */
export async function scheduleRide(
  input: RideData,
  actorUserId: Actor,
  {
    opensForSignUp = false,
    staffingLeadHours = null,
  }: { opensForSignUp?: boolean; staffingLeadHours?: number | null } = {},
) {
  const {
    trishawIds,
    returnLeg,
    passengerIds,
    pilotIds,
    photoFileIds,
    ...fields
  } = shapedForModel(input);
  const now = new Date();
  const ahead = fields.startsAt > now;
  const insideStaffingWindow =
    staffingLeadHours !== null &&
    fields.startsAt.getTime() - now.getTime() <= staffingLeadHours * HOUR_MS;
  const data = {
    ...fields,
    announcedAt: fields.announced && ahead ? now : null,
    staffingCheckedAt: insideStaffingWindow ? now : null,
  };
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
    await staffAndBook(
      ride,
      passengerIds,
      pilotIds,
      actorUserId,
      tx,
      emit,
      back ? { role: "lead", otherRideId: back.id } : null,
    );
    if (back)
      await staffAndBook(back, passengerIds, pilotIds, actorUserId, tx, emit, {
        role: "follow",
        otherRideId: ride.id,
      });
    if (ahead && opensForSignUp && pilotIds.length < data.requiredPilots) {
      await emit({
        type: "ride.opened",
        rideId: ride.id,
        chapterId: ride.chapterId,
        actorUserId,
        pair: back ? { role: "lead", otherRideId: back.id } : null,
      });
      if (back)
        await emit({
          type: "ride.opened",
          rideId: back.id,
          chapterId: back.chapterId,
          actorUserId,
          pair: { role: "follow", otherRideId: ride.id },
        });
    }
    if (data.announcedAt)
      await emit({
        type: "ride.announced",
        rideId: ride.id,
        chapterId: ride.chapterId,
        actorUserId,
      });
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
  pair: RidePair,
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
    await emit({ type: "ride.riderBooked", ...scope, passengerId, pair });
  for (const userId of pilotIds)
    await emit({
      type: "ride.pilotAssigned",
      ...scope,
      userId,
      self: actorUserId === userId,
      pair,
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
    const pairOf = (legId: string): RidePair =>
      moves.length < 2
        ? null
        : legId === id
          ? { role: "lead", otherRideId: moves[1].leg.id }
          : { role: "follow", otherRideId: id };
    for (const { leg, to } of moves) {
      const row = await updateRide(leg.id, { ...to, ...UNSWEPT }, tx);
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
        { type: "ride.rescheduled", changes: ["time"], pair: pairOf(leg.id) },
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
    const leavingEvent =
      parsed.model !== undefined &&
      parsed.model !== "event" &&
      ride.model === "event";
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
    const current = await modelShapeOf(ride, tx);
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

    const data = {
      ...Object.fromEntries(
        changed.map((field) => [field, blankToNull(wanted[field])]),
      ),
      ...(leavingEvent && ride.announced ? { announced: false } : {}),
    } as Prisma.RideUncheckedUpdateInput;
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
      changes.length
        ? { type: "ride.rescheduled", changes, pair: null }
        : undefined,
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
        {
          type: "ride.cancelled",
          reasonCode,
          pair:
            ids.length < 2
              ? null
              : rideId === ride.id
                ? { role: "lead", otherRideId: ids[1] }
                : { role: "follow", otherRideId: ride.id },
        },
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
    const current = await modelShapeOf(ride, tx);
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

const isBooked = (ride: RideDetailRow, passengerId: string) => {
  const entry = entryOf(ride, passengerId);
  return entry !== undefined && entry.attendance !== "cancelled";
};

/**
 * A rider who gave their seat up keeps the row, so booking them again takes
 * the same row back rather than adding a second one.
 */
async function takeSeat(
  ride: RideDetailRow,
  passengerId: string,
  actorUserId: Actor,
  position: number,
  tx: Tx,
  at?: number,
) {
  const given = entryOf(ride, passengerId);
  if (given)
    return updateRosterEntry(
      given.id,
      {
        attendance: "booked",
        cancelledAt: null,
        confirmedAt: null,
        bookedByUserId: actorUserId,
      },
      tx,
    );
  const entry = { rideId: ride.id, passengerId, bookedByUserId: actorUserId };
  return at === undefined
    ? insertRosterEntry({ ...entry, position }, tx)
    : insertRosterEntryAt({ ...entry, position: at }, tx);
}

const nextPosition = (ride: RideDetailRow) =>
  Math.max(-1, ...ride.roster.map((entry) => entry.position)) + 1;

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
    requireRoom(ride, "pilots", await pilotsOn(ride, tx));
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
      { type: "ride.pilotAssigned", userId, self, pair: null },
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
      {
        type: "ride.pilotUnassigned",
        userId,
        self: actorUserId === userId,
        pair: null,
      },
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
    const seated = seatedOn(ride);
    requireRoom(ride, "passengers", seated.length);

    const before = at === undefined ? undefined : seated[at];
    await takeSeat(
      ride,
      passengerId,
      actorUserId,
      nextPosition(ride),
      tx,
      before?.position,
    );
    await record(
      tx,
      emit,
      ride,
      actorUserId,
      "riderBooked",
      { passengerId },
      { type: "ride.riderBooked", passengerId, pair: null },
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
    const current = seatedOn(ride).flatMap(({ passenger }) =>
      passenger ? [passenger.id] : [],
    );
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
 * admins of that ride's chapter, and for all its members once the ride is an
 * announced event; one not on a ride yet only for its uploader.
 */
export async function photoReadRule(fileId: string) {
  const file = await findRidePhotoFile(fileId);
  if (!file || file.kind !== "ridePhoto") return null;
  const ride = file.ridePhotos[0]?.ride;
  const rule: FileReadRule = ride
    ? {
        kind: "members",
        chapterIds: [ride.chapterId],
        roles:
          ride.model === "event" && ride.announced
            ? ["admin", "pilot", "passenger"]
            : ["admin"],
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
    const entry = entryOf(ride, passengerId);
    if (!entry) return false;
    await deleteRosterEntry(rideId, passengerId, tx);
    const seated = entry.attendance !== "cancelled";
    await record(
      tx,
      emit,
      ride,
      actorUserId,
      "riderRemoved",
      { passengerId },
      {
        type: "ride.riderRemoved",
        passengerId,
        self:
          actorUserId !== null &&
          (entry.passenger?.managedByUserId === actorUserId ||
            entry.passenger?.userId === actorUserId),
        rosterNowEmpty: seated && seatedOn(ride).length === 1,
        pair: null,
      },
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

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** A ride that moves is reminded, checked and staffed again for its new time. */
const UNSWEPT = {
  staffingCheckedAt: null,
  riderReminderSentAt: null,
  volunteerReminderSentAt: null,
  demandCheckedAt: null,
} as const;
const OPEN_RIDES_ON_PAGE = 30;
const OPEN_RIDES_BATCH = OPEN_RIDES_ON_PAGE * 2;
const STAFFING_BATCH = 200;

/**
 * A pilot who was demoted or left the chapter keeps their assignment row but
 * no longer fills a seat: only pilots still piloting in the ride's chapter
 * count, as in the crew lists.
 */
async function pilotCounter(chapterIds: string[], pilotIds: string[], db?: Tx) {
  const active = pilotIds.length
    ? await findStillPiloting(
        [...new Set(chapterIds)],
        [...new Set(pilotIds)],
        db,
      )
    : new Set<string>();
  return (chapterId: string, ids: string[]) =>
    ids.filter((id) => active.has(`${chapterId}:${id}`)).length;
}

async function pilotsOn(ride: RideDetailRow, tx: Tx) {
  const pilotIds = ride.assignments
    .filter((assignment) => assignment.role === "pilot")
    .map((assignment) => assignment.user.id);
  const count = await pilotCounter([ride.chapterId], pilotIds, tx);
  return count(ride.chapterId, pilotIds);
}

const pilotIdsOf = (row: OpenRideQueryRow) =>
  row.assignments.map((assignment) => assignment.userId);

async function withPilotsOn(rows: OpenRideQueryRow[]) {
  const count = await pilotCounter(
    rows.map((row) => row.chapterId),
    rows.flatMap(pilotIdsOf),
  );
  return rows.map(({ assignments, ...row }) => ({
    ...row,
    _count: {
      ...row._count,
      assignments: count(
        row.chapterId,
        assignments.map((assignment) => assignment.userId),
      ),
    },
  }));
}

export type OpenRideRow = Awaited<ReturnType<typeof withPilotsOn>>[number];

const stillNeedsPilots = (ride: OpenRideRow) =>
  ride._count.assignments < ride.requiredPilots;

/**
 * Rides in these chapters that still need a pilot and this pilot is not on
 * yet, soonest first. The rows carry how many ride along, never who. Whether
 * a ride is staffed is only known once its pilots are counted, so the window
 * is read in batches until the page is full: a run of staffed rides never
 * hides an open one behind it.
 */
export async function listOpenRidesForPilot(
  userId: string,
  chapterIds: string[],
  now = new Date(),
) {
  if (!chapterIds.length) return [];
  const until = new Date(now.getTime() + OPEN_RIDES_DAYS * DAY_MS);
  const open: OpenRideRow[] = [];
  let after: RideCursor | undefined;
  while (open.length < OPEN_RIDES_ON_PAGE) {
    const rows = await findOpenRidesFor(
      userId,
      chapterIds,
      now,
      until,
      OPEN_RIDES_BATCH,
      after,
    );
    open.push(...(await withPilotsOn(rows)).filter(stillNeedsPilots));
    if (rows.length < OPEN_RIDES_BATCH) break;
    after = rows[rows.length - 1];
  }
  return open.slice(0, OPEN_RIDES_ON_PAGE);
}

export async function getOpenRideForPilot(
  rideId: string,
  chapterIds: string[],
  now = new Date(),
) {
  if (!chapterIds.length) return null;
  const row = await findOpenRide(rideId, chapterIds, now);
  if (!row) return null;
  const [ride] = await withPilotsOn([row]);
  return stillNeedsPilots(ride) ? ride : null;
}

/**
 * A round trip is one outing for whoever pilots it: signing up for one leg
 * takes the other too while it still needs a pilot, and stepping back from
 * one leaves the other while there is still time. Both legs are locked by
 * `requireRide`, so the other leg is read under the same lock.
 */
async function otherLegOf(ride: RideDetailRow, tx: Tx) {
  const other = ride.returnLeg ?? ride.returnLegOf;
  return other?.status === "scheduled" ? findRideDetail(other.id, tx) : null;
}

const pairOfLegs = (legs: RideDetailRow[], leg: RideDetailRow): RidePair =>
  legs.length < 2
    ? null
    : leg.returnLeg
      ? { role: "lead", otherRideId: leg.returnLeg.id }
      : { role: "follow", otherRideId: leg.returnLegOf!.id };

/**
 * Lifecycle 3B-b: a pilot takes a seat on the saddle. The ride row is locked
 * before the pilots are counted, so two pilots signing up for the last place
 * at once queue up, and the second one finds the ride staffed.
 */
export async function selfAssign(
  rideId: string,
  userId: string,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (ride.startsAt <= now) throw new DomainError("rideClosed");
    if (isAssigned(ride, userId, "pilot")) return false;
    if ((await pilotsOn(ride, tx)) >= ride.requiredPilots)
      throw new DomainError("rideFullyStaffed");
    const other = await otherLegOf(ride, tx);
    const legs = [
      ride,
      ...(other &&
      other.startsAt > now &&
      !isAssigned(other, userId, "pilot") &&
      (await pilotsOn(other, tx)) < other.requiredPilots
        ? [other]
        : []),
    ];
    for (const leg of legs) {
      await insertAssignment(
        { rideId: leg.id, userId, role: "pilot", assignedByUserId: null },
        tx,
      );
      await record(
        tx,
        emit,
        leg,
        userId,
        "pilotAssigned",
        { userId, role: "pilot" },
        {
          type: "ride.pilotAssigned",
          userId,
          self: true,
          pair: pairOfLegs(legs, leg),
        },
      );
    }
    return true;
  });
}

/**
 * A pilot steps back from a ride, but only from their own seat and only
 * while there is time to find someone else. Inside the staffing window it is
 * a phone call to the chapter instead.
 */
export async function withdraw(
  rideId: string,
  userId: string,
  leadHours: number,
  now = new Date(),
) {
  const tooLate = (leg: RideDetailRow) =>
    leg.startsAt.getTime() - now.getTime() < leadHours * HOUR_MS;
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (!isAssigned(ride, userId, "pilot"))
      throw new DomainError("notAssigned");
    if (tooLate(ride)) throw new DomainError("tooLateToWithdraw");
    const other = await otherLegOf(ride, tx);
    const legs = [
      ride,
      ...(other && isAssigned(other, userId, "pilot") && !tooLate(other)
        ? [other]
        : []),
    ];
    for (const leg of legs) {
      await deleteAssignment(leg.id, userId, "pilot", tx);
      if (leg.staffingCheckedAt)
        await updateRide(leg.id, { staffingCheckedAt: null }, tx);
      await record(
        tx,
        emit,
        leg,
        userId,
        "pilotUnassigned",
        { userId, role: "pilot" },
        {
          type: "ride.pilotUnassigned",
          userId,
          self: true,
          pair: pairOfLegs(legs, leg),
        },
      );
    }
    return true;
  });
}

export const withdrawalClosesAt = (startsAt: Date, leadHours: number) =>
  new Date(startsAt.getTime() - leadHours * HOUR_MS);

/** Chapters with a ride not checked yet that could be inside some staffing window. */
export const listChaptersToCheck = (maxLeadHours: number, now = new Date()) =>
  findChaptersWithUncheckedRides(
    now,
    new Date(now.getTime() + maxLeadHours * HOUR_MS),
  );

/**
 * Rides of these chapters already inside a staffing window of `leadHours` and
 * not checked yet. Every one is due, so a full batch still makes progress.
 */
export const listStaffingCandidates = async (
  chapterIds: string[],
  leadHours: number,
  now = new Date(),
  take = STAFFING_BATCH,
) =>
  chapterIds.length && take > 0
    ? findStaffingCandidates(
        chapterIds,
        now,
        new Date(now.getTime() + leadHours * HOUR_MS),
        take,
      )
    : [];

/**
 * A pilot who stops piloting in a chapter leaves their seats empty, so the
 * upcoming rides they were on are checked again: the next sweep warns about
 * those now short and quietly stamps the rest.
 */
export const reopenStaffingChecksOf = async (
  userId: string,
  chapterId: string,
  now = new Date(),
) => (await clearStaffingChecksOfPilot(userId, chapterId, now)).count;

/**
 * Lifecycle 3D: the check runs once per ride. The stamp and the warning are
 * written in one transaction under the ride's lock, so a retried sweep finds
 * the stamp and stays quiet, and a ride staffed in the meantime is stamped
 * without a warning. The way there takes its way back along: both legs short
 * are one warning, through the events' `pair`.
 */
export async function checkStaffing(rideId: string, now = new Date()) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(rideId, tx);
    if (
      ride.status !== "scheduled" ||
      ride.startsAt <= now ||
      ride.staffingCheckedAt
    )
      return false;
    const back =
      ride.returnLeg?.status === "scheduled"
        ? await findRideDetail(ride.returnLeg.id, tx)
        : null;
    const legs = [ride, ...(back && !back.staffingCheckedAt ? [back] : [])];
    const short: { leg: RideDetailRow; assigned: number }[] = [];
    for (const leg of legs) {
      await updateRide(leg.id, { staffingCheckedAt: now }, tx);
      const assigned = await pilotsOn(leg, tx);
      if (assigned < leg.requiredPilots) short.push({ leg, assigned });
    }
    const shortLegs = short.map(({ leg }) => leg);
    for (const { leg, assigned } of short)
      await emit({
        type: "ride.understaffed",
        rideId: leg.id,
        chapterId: leg.chapterId,
        actorUserId: null,
        assigned,
        required: leg.requiredPilots,
        pair: pairOfLegs(shortLegs, leg),
      });
    return short.length > 0;
  });
}

/**
 * Only an event ride still ahead can be announced to the chapter's riders.
 * They are told the first time; taking it back and announcing it again tells
 * nobody twice.
 */
export async function setAnnounced(
  rideId: string,
  announced: boolean,
  actorUserId: Actor,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (announced && ride.model !== "event")
      throw new DomainError("eventsOnly");
    if (announced && ride.startsAt <= now) throw new DomainError("rideClosed");
    if (ride.announced === announced) return false;
    const firstTime = announced && !ride.announcedAt;
    await updateRide(
      rideId,
      { announced, ...(firstTime ? { announcedAt: now } : {}) },
      tx,
    );
    await record(
      tx,
      emit,
      ride,
      actorUserId,
      "edited",
      { fields: ["announced"] },
      firstTime ? { type: "ride.announced" } : undefined,
    );
    return true;
  });
}

/**
 * The announced events in the chapters of these riders that still have one
 * of them to bring along: an event every rider of its chapter is booked on
 * is already among the account's own rides.
 */
export async function listAnnouncedEvents(
  riders: { id: string; chapterId: string }[],
  now = new Date(),
  take = 20,
) {
  if (!riders.length) return [];
  const events = await findAnnouncedEvents(
    [...new Set(riders.map((rider) => rider.chapterId))],
    now,
    take,
  );
  if (!events.length) return events;
  const booked = new Set(
    (
      await findBookingsOn(
        events.map((event) => event.id),
        riders.map((rider) => rider.id),
      )
    ).map((entry) => `${entry.rideId}:${entry.passengerId}`),
  );
  return events.filter((event) =>
    riders.some(
      (rider) =>
        rider.chapterId === event.chapterId &&
        !booked.has(`${event.id}:${rider.id}`),
    ),
  );
}

export const getAnnouncedEvent = (
  rideId: string,
  chapterIds: string[],
  now = new Date(),
) =>
  chapterIds.length
    ? findAnnouncedEvent(rideId, chapterIds, now)
    : Promise.resolve(null);

export const seatsLeft = (ride: {
  capacity: number | null;
  _count: { roster: number };
}) =>
  ride.capacity === null
    ? null
    : Math.max(0, ride.capacity - ride._count.roster);

/**
 * Lifecycle 4B-b: riders enrol themselves on an announced event. The ride is
 * locked and the roster recounted before any seat is taken, and a booking that
 * would overfill it is refused whole rather than seating half the family.
 */
export async function bookSeats(
  rideId: string,
  passengerIds: string[],
  actorUserId: string,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (ride.model !== "event" || !ride.announced || ride.startsAt <= now)
      throw new DomainError("unknownRide");
    const fresh = passengerIds.filter((id) => !isBooked(ride, id));
    if (!fresh.length) return 0;
    if (
      ride.capacity !== null &&
      seatedOn(ride).length + fresh.length > ride.capacity
    )
      throw new DomainError("rideFull");
    let position = nextPosition(ride);
    for (const passengerId of fresh) {
      await takeSeat(ride, passengerId, actorUserId, position++, tx);
      await record(
        tx,
        emit,
        ride,
        actorUserId,
        "riderBooked",
        { passengerId },
        { type: "ride.riderBooked", passengerId, pair: null },
      );
    }
    return fresh.length;
  });
}

/** Who runs the ride on the day: one of its pilots, or an admin of its chapter. */
export type Executor = "pilot" | "admin";

const CHECK_IN_LEAD_MS = CHECK_IN_LEAD_MINUTES * MINUTE_MS;

const withinPilotWindow = (ride: { endsAt: Date }, now: Date) =>
  ride.endsAt.getTime() >= now.getTime() - FINISH_WINDOW_MS;

/**
 * Lifecycle 6B: the door opens two hours before the start. A pilot keeps it
 * until the finish page closes a day after the ride; an admin may still record
 * a ride afterwards, for as long as its roster is not closed.
 */
export const checkInOpen = (
  ride: { status: string; startsAt: Date; endsAt: Date },
  as: Executor,
  now = new Date(),
) =>
  ride.status === "scheduled" &&
  now.getTime() >= ride.startsAt.getTime() - CHECK_IN_LEAD_MS &&
  (as === "admin" || withinPilotWindow(ride, now));

/** A roster closes once the ride has started, by the same people and window. */
export const canComplete = (
  ride: { status: string; startsAt: Date; endsAt: Date },
  as: Executor,
  now = new Date(),
) =>
  ride.status === "scheduled" &&
  ride.startsAt <= now &&
  (as === "admin" || withinPilotWindow(ride, now));

function requireCheckInOpen(ride: RideDetailRow, as: Executor, now: Date) {
  if (ride.status !== "scheduled") throw new DomainError("rideClosed");
  if (!checkInOpen(ride, as, now)) throw new DomainError("checkInClosed");
}

/**
 * A rider's seat on this ride and, for a round trip, on the other leg while
 * that one is still ahead: a seat given up or confirmed is given up or
 * confirmed for the whole outing.
 */
async function seatLegs(
  ride: RideDetailRow,
  passengerId: string,
  now: Date,
  tx: Tx,
) {
  const other = await otherLegOf(ride, tx);
  const otherEntry =
    other && other.startsAt > now ? entryOf(other, passengerId) : undefined;
  return [
    { leg: ride, entry: entryOf(ride, passengerId) },
    ...(other && otherEntry ? [{ leg: other, entry: otherEntry }] : []),
  ];
}

/**
 * Lifecycle 5B-b: the rider's side confirms the seat, or takes back a seat
 * they gave up while there is still room. Taking it back is a booking again,
 * and the ride's chat and the chapter hear about it as one.
 */
export async function confirmSeat(
  rideId: string,
  passengerId: string,
  actorUserId: string,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (ride.startsAt <= now) throw new DomainError("rideClosed");
    const legs = await seatLegs(ride, passengerId, now, tx);
    if (!legs[0].entry) throw new DomainError("unknownPassenger");
    const changing = legs.filter(
      ({ entry }) =>
        entry?.attendance === "booked" || entry?.attendance === "cancelled",
    );
    for (const { leg, entry } of changing) {
      const retaken = entry!.attendance === "cancelled";
      if (retaken) requireRoom(leg, "passengers", seatedOn(leg).length);
      await updateRosterEntry(
        entry!.id,
        { attendance: "confirmed", confirmedAt: now, cancelledAt: null },
        tx,
      );
      await record(
        tx,
        emit,
        leg,
        actorUserId,
        "seatConfirmed",
        { passengerId },
        retaken
          ? { type: "ride.riderBooked", passengerId, pair: null }
          : undefined,
      );
    }
    return changing.length > 0;
  });
}

/**
 * Lifecycle 5B-b: the rider's side gives the seat up before the ride. The row
 * stays, marked, so the rider still counts as signed up for Report 2; the
 * seat is free again, and when nobody is left to ride the chapter is told.
 */
export async function cancelSeat(
  rideId: string,
  passengerId: string,
  actorUserId: string,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireScheduled(rideId, tx);
    if (ride.startsAt <= now) throw new DomainError("rideClosed");
    const legs = await seatLegs(ride, passengerId, now, tx);
    if (!legs[0].entry) throw new DomainError("unknownPassenger");
    const leaving = legs.filter(
      ({ entry }) =>
        entry?.attendance === "booked" || entry?.attendance === "confirmed",
    );
    const leavingLegs = leaving.map(({ leg }) => leg);
    for (const { leg, entry } of leaving) {
      await updateRosterEntry(
        entry!.id,
        { attendance: "cancelled", cancelledAt: now, confirmedAt: null },
        tx,
      );
      await record(
        tx,
        emit,
        leg,
        actorUserId,
        "seatCancelled",
        { passengerId },
        {
          type: "ride.riderRemoved",
          passengerId,
          self: true,
          rosterNowEmpty: seatedOn(leg).length === 1,
          pair: pairOfLegs(leavingLegs, leg),
        },
      );
    }
    return leaving.length > 0;
  });
}

/** Lifecycle 6B: a rider on the roster is marked as here, or not after all. */
export async function setCheckedIn(
  rideId: string,
  entryId: string,
  checkedIn: boolean,
  actorUserId: string,
  as: Executor,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(rideId, tx);
    requireCheckInOpen(ride, as, now);
    const entry = ride.roster.find((candidate) => candidate.id === entryId);
    if (!entry || entry.attendance === "cancelled")
      throw new DomainError("unknownPassenger");
    if (checkedIn === (entry.attendance === "checkedIn")) return false;
    await updateRosterEntry(
      entry.id,
      checkedIn
        ? { attendance: "checkedIn", checkedInAt: now }
        : {
            attendance: entry.confirmedAt ? "confirmed" : "booked",
            checkedInAt: null,
          },
      tx,
    );
    await record(
      tx,
      emit,
      ride,
      actorUserId,
      checkedIn ? "checkedIn" : "checkInUndone",
      { entryId },
    );
    return true;
  });
}

/**
 * Lifecycle 6B: someone who turns up without a booking rides anyway. They have
 * no rider record, so the roster keeps only the name the pilot typed, and only
 * the ride's own crew and admins ever read it.
 */
export async function addWalkUp(
  input: WalkUpInput,
  actorUserId: string,
  as: Executor,
  now = new Date(),
) {
  const { rideId, firstName, lastName } = walkUpInput.parse(input);
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(rideId, tx);
    requireCheckInOpen(ride, as, now);
    requireRoom(ride, "passengers", seatedOn(ride).length);
    const { id } = await insertWalkUp(
      {
        rideId,
        guestName: [firstName, lastName].filter(Boolean).join(" "),
        position: nextPosition(ride),
        bookedByUserId: actorUserId,
        checkedInAt: now,
      },
      tx,
    );
    await record(tx, emit, ride, actorUserId, "walkUpAdded", { entryId: id });
    return id;
  });
}

/** A walk-up added by mistake goes again, as long as the door is open. */
export async function removeWalkUp(
  rideId: string,
  entryId: string,
  actorUserId: string,
  as: Executor,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(rideId, tx);
    requireCheckInOpen(ride, as, now);
    const entry = ride.roster.find((candidate) => candidate.id === entryId);
    if (!entry || entry.passenger) throw new DomainError("unknownPassenger");
    await deleteRosterEntryById(entry.id, tx);
    await record(tx, emit, ride, actorUserId, "walkUpRemoved", { entryId });
    return true;
  });
}

/**
 * Lifecycle 6D, the statistics moment: whoever was checked in rode, whoever
 * was booked and never came is a no-show, and every pilot not marked as
 * missing piloted. A second tap on a closed roster changes nothing.
 */
export async function closeRoster(
  rideId: string,
  actorUserId: string,
  as: Executor,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(rideId, tx);
    if (ride.status === "completed") return null;
    if (ride.status !== "scheduled") throw new DomainError("rideClosed");
    if (ride.startsAt > now) throw new DomainError("rideNotStarted");
    if (!canComplete(ride, as, now)) throw new DomainError("rideClosed");

    const riders = ride.roster.filter((e) => e.attendance === "checkedIn");
    const missing = ride.roster.filter(
      (e) => e.attendance === "booked" || e.attendance === "confirmed",
    );
    await updateRosterAttendance(
      ride.id,
      ["checkedIn"],
      { attendance: "completed" },
      tx,
    );
    await updateRosterAttendance(
      ride.id,
      ["booked", "confirmed"],
      { attendance: "noShow" },
      tx,
    );
    await updateAssignmentAttendance(
      { rideId: ride.id },
      ["signedUp"],
      "completed",
      tx,
    );
    await updateRide(
      ride.id,
      { status: "completed", completedAt: now, completedByUserId: actorUserId },
      tx,
    );
    const tally = { riders: riders.length, noShows: missing.length };
    await record(tx, emit, ride, actorUserId, "completed", tally, {
      type: "ride.completed",
      ...tally,
    });
    return tally;
  });
}

/**
 * An admin takes a closed roster back to correct it: everyone stands where
 * they stood on the day, and the ride counts again once it is closed again.
 * A pilot marked as missing stays marked.
 */
export async function reopenRide(rideId: string, actorUserId: string) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(rideId, tx);
    if (ride.status !== "completed") throw new DomainError("rideNotCompleted");
    await updateRosterAttendance(
      ride.id,
      ["completed"],
      { attendance: "checkedIn" },
      tx,
    );
    await updateRosterAttendance(
      ride.id,
      ["noShow"],
      { attendance: "confirmed" },
      tx,
      { confirmedAt: { not: null } },
    );
    await updateRosterAttendance(
      ride.id,
      ["noShow"],
      { attendance: "booked" },
      tx,
    );
    await updateAssignmentAttendance(
      { rideId: ride.id },
      ["completed"],
      "signedUp",
      tx,
    );
    await updateRide(
      ride.id,
      { status: "scheduled", completedAt: null, completedByUserId: null },
      tx,
    );
    await record(
      tx,
      emit,
      ride,
      actorUserId,
      "reopened",
      {},
      { type: "ride.reopened" },
    );
    return true;
  });
}

/** Report 1: a pilot who was on the ride but never came. */
export async function setPilotNoShow(
  rideId: string,
  userId: string,
  noShow: boolean,
  actorUserId: string,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const ride = await requireRide(rideId, tx);
    if (ride.status === "cancelled") throw new DomainError("rideClosed");
    if (ride.startsAt > now) throw new DomainError("rideNotStarted");
    const assignment = ride.assignments.find(
      (candidate) => candidate.user.id === userId && candidate.role === "pilot",
    );
    if (!assignment) throw new DomainError("notAssigned");
    const target = noShow
      ? "noShow"
      : ride.status === "completed"
        ? "completed"
        : "signedUp";
    if (assignment.attendance === target) return false;
    await updateAssignmentAttendance(
      { rideId: ride.id, userId },
      [assignment.attendance],
      target,
      tx,
    );
    await record(tx, emit, ride, actorUserId, "pilotNoShow", {
      userId,
      noShow,
    });
    return true;
  });
}

const debriefView = (row: RideDebriefRow) => ({
  ...row,
  distanceKm: row.distanceKm === null ? null : Number(row.distanceKm),
});
export type RideDebriefView = ReturnType<typeof debriefView>;

/**
 * Story 31 and lifecycle 7E: one report per pilot and ride, written again as
 * often as they like. Distance is measured only on a functional ride (Report
 * 11), and a donation is counted in the chapter's own currency.
 */
export async function submitDebrief(
  input: DebriefInput,
  userId: string,
  now = new Date(),
) {
  const data = debriefInput.parse(input);
  return rideWrite(async (tx, emit) => {
    const ride = await findRideById(data.rideId, tx);
    if (!ride) throw new DomainError("unknownRide");
    if (ride.status === "cancelled") throw new DomainError("rideClosed");
    if (ride.startsAt > now) throw new DomainError("rideNotStarted");
    const currency =
      data.donationCents === null
        ? null
        : currencyOfRegion(await findRideCountryCode(ride.id, tx));
    const row = await upsertDebrief(
      ride.id,
      userId,
      {
        distanceKm: ride.model === "functional" ? data.distanceKm : null,
        donationCents: data.donationCents,
        currency,
        bikeCondition: data.bikeCondition,
        cooperation: data.cooperation,
        note: data.note,
      },
      tx,
    );
    await record(tx, emit, ride, userId, "debriefed", {});
    return debriefView(row);
  });
}

export const getDebrief = async (rideId: string, userId: string) => {
  const row = await findDebrief(rideId, userId);
  return row ? debriefView(row) : null;
};

export const listDebriefs = async (rideId: string) =>
  (await findDebriefsOfRide(rideId)).map(debriefView);

export const chapterCurrencyOfRide = async (rideId: string) =>
  currencyOfRegion(await findRideCountryCode(rideId));

/** Chapters with a ride not swept yet for this marker, within the furthest lead. */
export const listChaptersDue = (
  marker: RideMarker,
  maxLeadMinutes: number,
  now = new Date(),
) =>
  findChaptersWithRidesDue(
    marker,
    now,
    new Date(now.getTime() + maxLeadMinutes * MINUTE_MS),
  );

export const listRidesDue = async (
  marker: RideMarker,
  chapterIds: string[],
  leadMinutes: number,
  now = new Date(),
  take = STAFFING_BATCH,
) =>
  chapterIds.length && take > 0
    ? findRidesDue(
        marker,
        chapterIds,
        now,
        new Date(now.getTime() + leadMinutes * MINUTE_MS),
        take,
      )
    : [];

/**
 * The legs a once-per-ride sweep covers in one go, stamped before anything is
 * said: the way there takes its way back along while that one is unstamped.
 */
async function sweepLegs(
  rideId: string,
  marker: RideMarker,
  now: Date,
  tx: Tx,
) {
  const ride = await requireRide(rideId, tx);
  if (ride.status !== "scheduled" || ride.startsAt <= now || ride[marker])
    return [];
  const back =
    ride.returnLeg?.status === "scheduled"
      ? await findRideDetail(ride.returnLeg.id, tx)
      : null;
  const legs = [ride, ...(back && !back[marker] ? [back] : [])];
  for (const leg of legs) await updateRide(leg.id, { [marker]: now }, tx);
  return legs;
}

const REMINDED_BY = {
  riderReminderSentAt: {
    type: "ride.riderReminderDue",
    reaches: (leg: RideDetailRow) =>
      seatedOn(leg).some((entry) => entry.passenger),
  },
  volunteerReminderSentAt: {
    type: "ride.volunteerReminderDue",
    reaches: (leg: RideDetailRow) => leg.assignments.length > 0,
  },
} as const;

/**
 * Lifecycle 5B: the reminder before a ride, to its riders' side or to its
 * pilots. The stamp and the event are written in one transaction under the
 * ride's lock, so a retried sweep finds the stamp and sends nothing twice;
 * each reminder is its own event, because a notification is once per event
 * and reader.
 */
export async function sendReminder(
  marker: keyof typeof REMINDED_BY,
  rideId: string,
  now = new Date(),
) {
  return rideWrite(async (tx, emit) => {
    const { type, reaches } = REMINDED_BY[marker];
    const reached = (await sweepLegs(rideId, marker, now, tx)).filter(reaches);
    for (const leg of reached)
      await emit({
        type,
        rideId: leg.id,
        chapterId: leg.chapterId,
        actorUserId: null,
        pair: pairOfLegs(reached, leg),
      });
    return reached.length > 0;
  });
}

/**
 * Lifecycle 4C: at the chapter's interval before the ride, a roster with
 * nobody left on it is flagged to the schedulers for cancellation, once.
 */
export async function checkDemand(rideId: string, now = new Date()) {
  return rideWrite(async (tx, emit) => {
    const empty = (await sweepLegs(rideId, "demandCheckedAt", now, tx)).filter(
      (leg) => seatedOn(leg).length === 0,
    );
    for (const leg of empty)
      await emit({
        type: "ride.noDemand",
        rideId: leg.id,
        chapterId: leg.chapterId,
        actorUserId: null,
        pair: pairOfLegs(empty, leg),
      });
    return empty.length > 0;
  });
}

const tallyRow = (row: TallyFactRow) => ({
  key: row.key,
  side: row.side,
  trips: Number(row.trips),
  rides: Number(row.rides),
  ms: Number(row.ms),
});

export async function activityFacts(
  scope: ReportScope,
  { extras }: { extras: boolean },
): Promise<ActivityFacts> {
  if (!scope.chapterIds.length)
    return { buckets: [], chapters: [], riders: [] };
  const [buckets, chapters, riders] = await Promise.all([
    findActivityBuckets(scope),
    extras ? findChapterTallies(scope) : [],
    findRiderCounts(scope, extras),
  ]);
  return {
    buckets: buckets.map((row) => ({
      side: row.side,
      bucket: row.bucket,
      model: row.model as ActivityBucketRow["model"],
      kind: row.kind,
      category: row.category as ActivityBucketRow["category"],
      trips: Number(row.trips),
      rides: Number(row.rides),
      ms: Number(row.ms),
    })),
    chapters: chapters.map(tallyRow),
    riders: riders.map((row) => ({
      side: row.side,
      riders: Number(row.riders),
      newRiders: Number(row.newRiders),
    })),
  };
}

export async function peopleTallies(scope: ReportScope): Promise<{
  pilots: Record<string, ReportTally>;
  riders: Record<string, ReportTally>;
}> {
  if (!scope.chapterIds.length) return { pilots: {}, riders: {} };
  const [pilots, riders] = await Promise.all([
    findPilotTallies(scope),
    findRiderTallies(scope),
  ]);
  return {
    pilots: tallies(pilots.map(tallyRow)),
    riders: tallies(riders.map(tallyRow)),
  };
}

export async function activeParticipants(
  chapterIds: string[],
  since: Date,
  until: Date,
): Promise<{ pilots: PilotMembership[]; riders: number }> {
  if (!chapterIds.length) return { pilots: [], riders: 0 };
  const [pilots, riders] = await Promise.all([
    findActivePilots(chapterIds, since, until),
    countActiveRiders(chapterIds, since, until),
  ]);
  return { pilots, riders };
}

export const earliestRideStart = async (chapterIds: string[]) =>
  chapterIds.length ? findEarliestRideStart(chapterIds) : null;

export {
  aggregateActivity,
  countryRollup,
  emptyTally,
  newRiders,
  peopleHealth,
  ranked,
  yearBefore,
} from "./report";
export { reportScope } from "./report-zones";
