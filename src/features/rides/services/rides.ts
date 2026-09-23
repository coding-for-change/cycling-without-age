import { prisma } from "@/lib/prisma";
import { Prisma, type $Enums } from "@/generated/prisma";

/**
 * What every calendar surface renders. Kept in one place so the week grid, the
 * trishaw timeline and the two agendas cannot drift into different shapes.
 */
const calendarSelect = {
  id: true,
  chapterId: true,
  model: true,
  status: true,
  startsAt: true,
  endsAt: true,
  locationName: true,
  locationAddress: true,
  destinationName: true,
  destinationAddress: true,
  cancelledAt: true,
  chapter: { select: { id: true, name: true, timeZone: true } },
  trishaws: {
    orderBy: { trishaw: { name: "asc" } },
    select: { trishaw: { select: { id: true, name: true, type: true } } },
  },
  assignments: {
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  _count: { select: { roster: true } },
} satisfies Prisma.RideSelect;

export type RideCalendarRow = Prisma.RideGetPayload<{
  select: typeof calendarSelect;
}>;

/**
 * What an assigned pilot sees on top of the shared shape. The RFP's
 * contact-detail exchange on match runs both ways — the client gets the pilot's
 * name, the pilot gets the client's (`04-ride-models.md` §7) — and a pilot
 * deciding whether a ride suits them needs to know who they would be riding
 * with, which is the whole of the request.
 *
 * Deliberately NOT folded into `calendarSelect`: `/passenger` reads that shape
 * too, and on a ride with more than one rider, one rider's manager must not
 * learn the other riders' names.
 */
const pilotSelect = {
  ...calendarSelect,
  roster: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      passenger: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.RideSelect;

export type PilotRideRow = Prisma.RideGetPayload<{
  select: typeof pilotSelect;
}>;

/**
 * Overlap, not containment: a ride that starts before the window and ends
 * inside it still occupies the window and must be drawn.
 */
const overlapping = (from: Date, to: Date) => ({
  startsAt: { lt: to },
  endsAt: { gt: from },
});

export const findRidesInRange = (chapterIds: string[], from: Date, to: Date) =>
  prisma.ride.findMany({
    where: { chapterId: { in: chapterIds }, ...overlapping(from, to) },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: calendarSelect,
  });

/**
 * Current membership is required as well as the assignment: removing someone
 * from a chapter deletes only their `member` row, so their `RideAssignment`
 * rows outlive it. Without this clause a removed pilot would keep reading that
 * chapter's rides — location, trishaw and roster size included.
 */
export const findRidesForPilot = (userId: string, from: Date, to: Date) =>
  prisma.ride.findMany({
    where: {
      assignments: { some: { userId } },
      chapter: { members: { some: { userId } } },
      ...overlapping(from, to),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: pilotSelect,
  });

export const findRidesForPassengers = (
  passengerIds: string[],
  from: Date,
  to: Date,
) =>
  prisma.ride.findMany({
    where: {
      roster: { some: { passengerId: { in: passengerIds } } },
      ...overlapping(from, to),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: calendarSelect,
  });

/**
 * What a subscribed calendar is told: when, where, which bike — and nobody's
 * name. A feed leaves the app for whichever provider the reader's calendar
 * lives with, so the who stays behind the link back into the app.
 * `assignments` is narrowed to the reader, which is all that "am I the pilot
 * here" needs.
 */
const feedSelect = (userId: string) =>
  ({
    id: true,
    chapterId: true,
    model: true,
    status: true,
    startsAt: true,
    endsAt: true,
    updatedAt: true,
    locationName: true,
    locationAddress: true,
    destinationName: true,
    destinationAddress: true,
    chapter: { select: { name: true } },
    trishaws: {
      orderBy: { trishaw: { name: "asc" } },
      select: { trishaw: { select: { name: true } } },
    },
    assignments: { where: { userId }, select: { role: true } },
  }) satisfies Prisma.RideSelect;

export type RideFeedRow = Prisma.RideGetPayload<{
  select: ReturnType<typeof feedSelect>;
}>;

export type FeedAudience = {
  /** Chapters whose rides the reader may see as their pilot. */
  pilotChapterIds: string[];
  /** Riders the reader manages. */
  passengerIds: string[];
};

/**
 * The union of `/pilot` and `/passenger` in one query. Who counts as a pilot
 * where is membership's question, answered before this runs; here it is only
 * a list of chapters the assignment must fall in.
 */
export const findRidesForCalendarFeed = (
  userId: string,
  { pilotChapterIds, passengerIds }: FeedAudience,
  from: Date,
  to: Date,
) =>
  prisma.ride.findMany({
    where: {
      ...overlapping(from, to),
      OR: [
        ...(pilotChapterIds.length
          ? [
              {
                assignments: { some: { userId } },
                chapterId: { in: pilotChapterIds },
              },
            ]
          : []),
        ...(passengerIds.length
          ? [{ roster: { some: { passengerId: { in: passengerIds } } } }]
          : []),
      ],
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: feedSelect(userId),
  });

export const findRideById = (id: string) =>
  prisma.ride.findUnique({ where: { id }, select: calendarSelect });

/**
 * Committing equipment is check-then-write, and two schedulers can both pass
 * the check before either writes. MySQL has no exclusion constraint that could
 * express "no overlapping window for this trishaw", and `UNIQUE(rideId,
 * trishawId)` only stops the same bike being listed twice on one ride — so the
 * trishaw rows are locked `FOR UPDATE` inside the transaction. A second booking
 * for the same bike waits there, and then sees the first one's reservation.
 */
type Writer<T> = (tx: Prisma.TransactionClient) => Promise<T>;

async function conflictsUnderLock(
  tx: Prisma.TransactionClient,
  trishawIds: string[],
  from: Date,
  to: Date,
  exceptRideId?: string,
) {
  if (!trishawIds.length) return [];

  await tx.$queryRaw(
    Prisma.sql`SELECT \`id\` FROM \`trishaw\` WHERE \`id\` IN (${Prisma.join(
      trishawIds,
    )}) FOR UPDATE`,
  );

  return tx.rideTrishaw.findMany({
    where: {
      trishawId: { in: trishawIds },
      ride: {
        status: { not: "cancelled" },
        ...overlapping(from, to),
        ...(exceptRideId ? { id: { not: exceptRideId } } : {}),
      },
    },
    select: { trishawId: true, rideId: true },
  });
}

/** `null` when the window is already taken — the caller names the refusal. */
async function reserving<T>(
  trishawIds: string[],
  from: Date,
  to: Date,
  write: Writer<T>,
  exceptRideId?: string,
): Promise<T | null> {
  return prisma.$transaction(async (tx) => {
    const conflicts = await conflictsUnderLock(
      tx,
      trishawIds,
      from,
      to,
      exceptRideId,
    );
    return conflicts.length ? null : write(tx);
  });
}

const reservationCreate = (trishawIds: string[]) => ({
  create: trishawIds.map((trishawId) => ({ trishawId })),
});

export const insertRideReserving = (
  data: Prisma.RideUncheckedCreateInput,
  trishawIds: string[],
  from: Date,
  to: Date,
) =>
  reserving(trishawIds, from, to, (tx) =>
    tx.ride.create({
      data: { ...data, trishaws: reservationCreate(trishawIds) },
      select: calendarSelect,
    }),
  );

/** Rescheduling replaces the reservation set outright, never merges into it. */
export const updateRideReserving = (
  id: string,
  data: Prisma.RideUncheckedUpdateInput,
  trishawIds: string[],
  from: Date,
  to: Date,
) =>
  reserving(
    trishawIds,
    from,
    to,
    (tx) =>
      tx.ride.update({
        where: { id },
        data: {
          ...data,
          trishaws: { deleteMany: {}, ...reservationCreate(trishawIds) },
        },
        select: calendarSelect,
      }),
    id,
  );

export const updateRideById = (
  id: string,
  data: Prisma.RideUncheckedUpdateInput,
) => prisma.ride.update({ where: { id }, data, select: calendarSelect });

export const upsertAssignment = (
  rideId: string,
  userId: string,
  role: $Enums.RideRole,
) =>
  prisma.rideAssignment.upsert({
    where: { rideId_userId_role: { rideId, userId, role } },
    create: { rideId, userId, role },
    update: {},
  });

export const deleteAssignment = (
  rideId: string,
  userId: string,
  role: $Enums.RideRole,
) =>
  prisma.rideAssignment.delete({
    where: { rideId_userId_role: { rideId, userId, role } },
  });

/** Appended to the end of the roster — coordinators order riders as they ride. */
export const upsertRosterEntry = (
  rideId: string,
  passengerId: string,
  position: number,
) =>
  prisma.rideRosterEntry.upsert({
    where: { rideId_passengerId: { rideId, passengerId } },
    create: { rideId, passengerId, position },
    update: {},
  });

export const countRosterEntries = (rideId: string) =>
  prisma.rideRosterEntry.count({ where: { rideId } });

export const deleteRosterEntry = (rideId: string, passengerId: string) =>
  prisma.rideRosterEntry.delete({
    where: { rideId_passengerId: { rideId, passengerId } },
  });
