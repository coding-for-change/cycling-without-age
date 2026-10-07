import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/utils";
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
  title: true,
  capacity: true,
  requiredPilots: true,
  locationName: true,
  locationAddress: true,
  destinationName: true,
  destinationAddress: true,
  cancelledAt: true,
  chapter: {
    select: {
      id: true,
      name: true,
      timeZone: true,
      countryId: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  },
  photos: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { fileId: true, position: true },
  },
  trishaws: {
    orderBy: { trishaw: { name: "asc" } },
    select: {
      trishaw: {
        select: {
          id: true,
          name: true,
          status: true,
          type: { select: { id: true, name: true } },
        },
      },
    },
  },
  assignments: {
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  },
  _count: { select: { roster: true } },
} satisfies Prisma.RideSelect;

export type RideCalendarRow = Prisma.RideGetPayload<{
  select: typeof calendarSelect;
}>;

/**
 * Pilots as members see them: who, never how to reach them. An email address
 * is the admin's to see; the contact exchange on match (PR 5) adds a phone
 * number deliberately, not an address by accident.
 */
function memberAssignments() {
  return {
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      user: { select: { id: true, name: true, image: true } },
    },
  } satisfies Prisma.Ride$assignmentsArgs;
}

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
  assignments: memberAssignments(),
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
 * What a rider's account sees in a list: the shared shape with the pilots'
 * names but not their email addresses, and a rider count but no other riders.
 */
const passengerSelect = {
  ...calendarSelect,
  assignments: memberAssignments(),
} satisfies Prisma.RideSelect;

export type PassengerRideRow = Prisma.RideGetPayload<{
  select: typeof passengerSelect;
}>;

const otherLeg = {
  select: { id: true, startsAt: true, endsAt: true, status: true },
} satisfies Prisma.Ride$returnLegArgs;

/**
 * What a member's detail page adds to the list shape. The note is for pilots
 * and the cancellation note is the admins' own words, so neither is here; a
 * cancelled ride is explained by its reason code.
 */
const memberDetail = {
  description: true,
  latitude: true,
  longitude: true,
  destinationLatitude: true,
  destinationLongitude: true,
  cancellationReasonCode: true,
  returnLeg: otherLeg,
  returnLegOf: otherLeg,
} satisfies Prisma.RideSelect;

const pilotDetailSelect = {
  ...pilotSelect,
  ...memberDetail,
  note: true,
} satisfies Prisma.RideSelect;

export type PilotRideDetailRow = Prisma.RideGetPayload<{
  select: typeof pilotDetailSelect;
}>;

/** Only the riders this account manages, never the others on the same ride. */
const passengerDetailSelect = (passengerIds: string[]) =>
  ({
    ...passengerSelect,
    ...memberDetail,
    roster: {
      where: { passengerId: { in: passengerIds } },
      orderBy: { position: "asc" },
      select: {
        id: true,
        passenger: { select: { id: true, firstName: true, lastName: true } },
      },
    },
  }) satisfies Prisma.RideSelect;

export type PassengerRideDetailRow = Prisma.RideGetPayload<{
  select: ReturnType<typeof passengerDetailSelect>;
}>;

/**
 * Overlap, not containment: a ride that starts before the window and ends
 * inside it still occupies the window and must be drawn.
 */
const overlapping = (from: Date, to: Date) => ({
  startsAt: { lt: to },
  endsAt: { gt: from },
});

const upcomingFrom = (now: Date) =>
  ({
    status: "scheduled",
    endsAt: { gt: now },
  }) satisfies Prisma.RideWhereInput;

export const findRidesInRange = (chapterIds: string[], from: Date, to: Date) =>
  prisma.ride.findMany({
    where: { chapterId: { in: chapterIds }, ...overlapping(from, to) },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: calendarSelect,
  });

/**
 * A `Member.role` is a comma-separated list of `admin`, `pilot` and
 * `passenger`, and only one of those contains "pilot". Revoking the role
 * rewrites the list and leaves the assignment rows, so the role is checked
 * here, not only the membership.
 */
const stillPiloting = (userId: string) =>
  ({ userId, role: { contains: "pilot" } }) satisfies Prisma.MemberWhereInput;

/**
 * Current membership is required as well as the assignment: removing someone
 * from a chapter deletes only their `member` row, so their `RideAssignment`
 * rows outlive it. Without this clause a removed pilot would keep reading that
 * chapter's rides — location, trishaw and roster size included.
 */
const pilotRideWhere = (userId: string) =>
  ({
    assignments: { some: { userId } },
    chapter: { members: { some: stillPiloting(userId) } },
  }) satisfies Prisma.RideWhereInput;

export const findRidesForPilot = (userId: string, from: Date, to: Date) =>
  prisma.ride.findMany({
    where: { ...pilotRideWhere(userId), ...overlapping(from, to) },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: pilotSelect,
  });

const passengerRideWhere = (passengerIds: string[]) =>
  ({
    roster: { some: { passengerId: { in: passengerIds } } },
  }) satisfies Prisma.RideWhereInput;

export const findRidesForPassengers = (
  passengerIds: string[],
  from: Date,
  to: Date,
) =>
  prisma.ride.findMany({
    where: { ...passengerRideWhere(passengerIds), ...overlapping(from, to) },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: passengerSelect,
  });

export type Side = "upcoming" | "past";

/** A ride still running is upcoming; the past runs newest first. */
const side = (now: Date, which: Side) =>
  which === "upcoming"
    ? {
        where: { endsAt: { gt: now } },
        orderBy: [{ startsAt: "asc" as const }, { id: "asc" as const }],
      }
    : {
        where: { endsAt: { lte: now } },
        orderBy: [{ startsAt: "desc" as const }, { id: "desc" as const }],
      };

export const findPilotRidesOn = (
  userId: string,
  now: Date,
  which: Side,
  take: number,
) =>
  prisma.ride.findMany({
    where: { ...pilotRideWhere(userId), ...side(now, which).where },
    orderBy: side(now, which).orderBy,
    select: pilotSelect,
    take,
  });

export const findPassengerRidesOn = (
  passengerIds: string[],
  now: Date,
  which: Side,
  take: number,
) =>
  prisma.ride.findMany({
    where: { ...passengerRideWhere(passengerIds), ...side(now, which).where },
    orderBy: side(now, which).orderBy,
    select: passengerSelect,
    take,
  });

export const findRideForPilot = (rideId: string, userId: string) =>
  prisma.ride.findFirst({
    where: { id: rideId, ...pilotRideWhere(userId) },
    select: pilotDetailSelect,
  });

export const findRideForPassengers = (rideId: string, passengerIds: string[]) =>
  prisma.ride.findFirst({
    where: { id: rideId, ...passengerRideWhere(passengerIds) },
    select: passengerDetailSelect(passengerIds),
  });

/**
 * Who a change to this ride concerns: its pilots and whoever manages its
 * riders. An assignment outlives the pilot role and the membership it came
 * with, so only pilots who still hold the role in the ride's chapter count.
 */
export async function findRideParticipants(rideId: string) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: {
      chapterId: true,
      roster: {
        select: {
          passenger: { select: { managedByUserId: true, userId: true } },
        },
      },
    },
  });
  if (!ride) return null;
  const assignments = await prisma.rideAssignment.findMany({
    where: {
      rideId,
      user: {
        members: {
          some: {
            organizationId: ride.chapterId,
            role: { contains: "pilot" },
          },
        },
      },
    },
    select: { userId: true },
  });
  return { ...ride, assignments };
}

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

/** One slice of a feed: `endedBy` keeps a past slice clear of the rides still running. */
export type FeedSlice = { take: number; latestFirst?: boolean; endedBy?: Date };

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
  { take, latestFirst = false, endedBy }: FeedSlice,
) =>
  prisma.ride.findMany({
    where: {
      startsAt: { lt: to },
      endsAt: endedBy ? { gt: from, lte: endedBy } : { gt: from },
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
    orderBy: latestFirst
      ? [{ startsAt: "desc" }, { id: "desc" }]
      : [{ startsAt: "asc" }, { id: "asc" }],
    take,
    select: feedSelect(userId),
  });

export const findRideById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.ride.findUnique({ where: { id }, select: calendarSelect });

export const findRideScope = (id: string) =>
  prisma.ride.findUnique({
    where: { id },
    select: {
      id: true,
      chapterId: true,
      trishaws: { select: { trishawId: true } },
    },
  });

/**
 * Committing equipment is check-then-write, and two schedulers can both pass
 * the check before either writes. MySQL has no exclusion constraint that could
 * express "no overlapping window for this trishaw", and `UNIQUE(rideId,
 * trishawId)` only stops the same bike being listed twice on one ride — so the
 * trishaw rows are locked `FOR UPDATE` inside the transaction. A second booking
 * for the same bike waits there, and then sees the first one's reservation.
 * The caller owns the transaction; this must run inside it, before the write.
 */
export async function conflictsUnderLock(
  tx: Prisma.TransactionClient,
  trishawIds: string[],
  windows: { startsAt: Date; endsAt: Date }[],
  exceptRideIds: string[] = [],
) {
  if (!trishawIds.length || !windows.length) return [];

  await tx.$queryRaw(
    Prisma.sql`SELECT \`id\` FROM \`trishaw\` WHERE \`id\` IN (${Prisma.join(
      trishawIds,
    )}) FOR UPDATE`,
  );

  return findReservations(trishawIds, windows, exceptRideIds, tx);
}

export const findReservations = async (
  trishawIds: string[],
  windows: { startsAt: Date; endsAt: Date }[],
  exceptRideIds: string[],
  db: Prisma.TransactionClient = prisma,
) =>
  !trishawIds.length || !windows.length
    ? []
    : db.rideTrishaw.findMany({
        where: {
          trishawId: { in: trishawIds },
          ride: {
            status: { not: "cancelled" },
            ...(windows.length === 1
              ? overlapping(windows[0].startsAt, windows[0].endsAt)
              : {
                  OR: windows.map((window) =>
                    overlapping(window.startsAt, window.endsAt),
                  ),
                }),
            ...(exceptRideIds.length ? { id: { notIn: exceptRideIds } } : {}),
          },
        },
        select: { trishawId: true, rideId: true },
      });

/**
 * Serialises every write on these rides. Locked in id order, so two writes on
 * both legs of a round trip queue up instead of deadlocking.
 */
export const lockRides = async (
  tx: Prisma.TransactionClient,
  ids: string[],
) => {
  if (!ids.length) return;
  await tx.$queryRaw(
    Prisma.sql`SELECT \`id\` FROM \`ride\` WHERE \`id\` IN (${Prisma.join(
      [...new Set(ids)].sort(),
    )}) ORDER BY \`id\` FOR UPDATE`,
  );
};

export const findRideLegIds = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) =>
  db.ride.findUnique({
    where: { id },
    select: {
      id: true,
      returnLegOfId: true,
      returnLeg: { select: { id: true } },
    },
  });

/** Names for the ids a ride's history refers to, read when the history is shown. */
export const findLogNames = async (
  userIds: string[],
  passengerIds: string[],
) => {
  const [users, riders] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [],
    passengerIds.length
      ? prisma.passenger.findMany({
          where: { id: { in: passengerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [],
  ]);
  return new Map<string, string>([
    ...users.map((user) => [user.id, user.name] as const),
    ...riders.map((rider) => [rider.id, fullName(rider)] as const),
  ]);
};

const reservationCreate = (trishawIds: string[]) => ({
  create: trishawIds.map((trishawId) => ({ trishawId })),
});

export const insertRide = (
  data: Prisma.RideUncheckedCreateInput,
  trishawIds: string[],
  db: Prisma.TransactionClient = prisma,
) =>
  db.ride.create({
    data: { ...data, trishaws: reservationCreate(trishawIds) },
    select: calendarSelect,
  });

export const updateRide = (
  id: string,
  data: Prisma.RideUncheckedUpdateInput,
  db: Prisma.TransactionClient = prisma,
) => db.ride.update({ where: { id }, data, select: calendarSelect });

/** Rescheduling replaces the reservation set outright, never merges into it. */
export const replaceRideTrishaws = (
  id: string,
  trishawIds: string[],
  db: Prisma.TransactionClient = prisma,
) =>
  db.ride.update({
    where: { id },
    data: { trishaws: { deleteMany: {}, ...reservationCreate(trishawIds) } },
    select: calendarSelect,
  });

export const deleteRideById = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.ride.delete({ where: { id }, select: { id: true } });

export const insertAssignment = (
  data: {
    rideId: string;
    userId: string;
    role: $Enums.RideRole;
    assignedByUserId: string | null;
  },
  db: Prisma.TransactionClient = prisma,
) => db.rideAssignment.create({ data, select: { id: true } });

export const deleteAssignment = (
  rideId: string,
  userId: string,
  role: $Enums.RideRole,
  db: Prisma.TransactionClient = prisma,
) => db.rideAssignment.deleteMany({ where: { rideId, userId, role } });

/** Appended to the end of the roster — coordinators order riders as they ride. */
export const insertRosterEntry = (
  data: {
    rideId: string;
    passengerId: string;
    position: number;
    bookedByUserId: string | null;
  },
  db: Prisma.TransactionClient = prisma,
) => db.rideRosterEntry.create({ data, select: { id: true } });

export async function insertRosterEntryAt(
  data: {
    rideId: string;
    passengerId: string;
    position: number;
    bookedByUserId: string | null;
  },
  db: Prisma.TransactionClient = prisma,
) {
  await db.rideRosterEntry.updateMany({
    where: { rideId: data.rideId, position: { gte: data.position } },
    data: { position: { increment: 1 } },
  });
  return db.rideRosterEntry.create({ data, select: { id: true } });
}

export async function updateRosterPositions(
  rideId: string,
  passengerIds: string[],
  db: Prisma.TransactionClient = prisma,
) {
  for (const [position, passengerId] of passengerIds.entries())
    await db.rideRosterEntry.updateMany({
      where: { rideId, passengerId },
      data: { position },
    });
}

export const insertRosterEntries = (
  rideId: string,
  passengerIds: string[],
  bookedByUserId: string | null,
  db: Prisma.TransactionClient = prisma,
) =>
  db.rideRosterEntry.createMany({
    data: passengerIds.map((passengerId, position) => ({
      rideId,
      passengerId,
      position,
      bookedByUserId,
    })),
  });

export const insertAssignments = (
  rideId: string,
  userIds: string[],
  assignedByUserId: string | null,
  db: Prisma.TransactionClient = prisma,
) =>
  db.rideAssignment.createMany({
    data: userIds.map((userId) => ({
      rideId,
      userId,
      role: "pilot" as const,
      assignedByUserId,
    })),
  });

export const replaceRidePhotos = (
  rideId: string,
  fileIds: string[],
  db: Prisma.TransactionClient = prisma,
) =>
  db.ride.update({
    where: { id: rideId },
    data: {
      photos: {
        deleteMany: {},
        create: fileIds.map((fileId, position) => ({ fileId, position })),
      },
    },
    select: { id: true },
  });

export const deleteRosterEntry = (
  rideId: string,
  passengerId: string,
  db: Prisma.TransactionClient = prisma,
) => db.rideRosterEntry.deleteMany({ where: { rideId, passengerId } });

/**
 * Everything the admin detail page shows. Rider names are here because only a
 * chapter admin reads this shape; the member surfaces have their own selects.
 */
const detailSelect = {
  ...calendarSelect,
  description: true,
  latitude: true,
  longitude: true,
  destinationLatitude: true,
  destinationLongitude: true,
  note: true,
  seriesId: true,
  cancellationReasonCode: true,
  cancellationNote: true,
  cancelledBy: { select: { id: true, name: true } },
  createdAt: true,
  returnLegOf: {
    select: { id: true, startsAt: true, endsAt: true, status: true },
  },
  returnLeg: {
    select: { id: true, startsAt: true, endsAt: true, status: true },
  },
  assignments: {
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      createdAt: true,
      assignedByUserId: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  },
  roster: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      position: true,
      createdAt: true,
      passenger: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          chapterId: true,
          managedByUserId: true,
          userId: true,
          user: { select: { email: true } },
        },
      },
    },
  },
} satisfies Prisma.RideSelect;

export type RideDetailRow = Prisma.RideGetPayload<{
  select: typeof detailSelect;
}>;

const listCursorWhere = (cursor: { startsAt: Date; id: string } | null) =>
  cursor
    ? {
        OR: [
          { startsAt: { gt: cursor.startsAt } },
          { startsAt: cursor.startsAt, id: { gt: cursor.id } },
        ],
      }
    : {};

export const findPastRidesForList = (
  chapterIds: string[],
  now: Date,
  take: number,
) =>
  prisma.ride.findMany({
    where: { chapterId: { in: chapterIds }, endsAt: { lte: now } },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    select: calendarSelect,
    take,
  });

export const findUpcomingRidesForList = (
  chapterIds: string[],
  now: Date,
  cursor: { startsAt: Date; id: string } | null,
  take: number,
) =>
  prisma.ride.findMany({
    where: {
      chapterId: { in: chapterIds },
      endsAt: { gt: now },
      ...listCursorWhere(cursor),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: calendarSelect,
    take,
  });

export const findRideDetail = (
  id: string,
  db: Prisma.TransactionClient = prisma,
) => db.ride.findUnique({ where: { id }, select: detailSelect });

const trishawRideSelect = {
  id: true,
  chapterId: true,
  model: true,
  status: true,
  startsAt: true,
  endsAt: true,
  locationName: true,
  chapter: { select: { id: true, name: true, timeZone: true } },
  assignments: {
    select: { role: true, user: { select: { id: true, name: true } } },
  },
} satisfies Prisma.RideSelect;

export type TrishawRideRow = Prisma.RideGetPayload<{
  select: typeof trishawRideSelect;
}>;

export const findRidesOfTrishaw = (trishawId: string, take: number) =>
  prisma.ride.findMany({
    where: { trishaws: { some: { trishawId } } },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    select: trishawRideSelect,
    take,
  });

export const findRideIdsWithTrishawFrom = async (
  trishawId: string,
  now: Date,
) =>
  (
    await prisma.ride.findMany({
      where: { trishaws: { some: { trishawId } }, ...upcomingFrom(now) },
      select: { id: true },
    })
  ).map((ride) => ride.id);

export const countFutureRidesWithTrishaws = (
  chapterId: string,
  trishawIds: string[],
  now: Date,
) =>
  prisma.ride.count({
    where: {
      chapterId,
      ...upcomingFrom(now),
      trishaws: { some: { trishawId: { in: trishawIds } } },
    },
  });

const FINISH_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * The finish page shows the storage access code, so it stays readable only
 * until a day after the ride ends.
 */
const finishableAt = (now: Date) =>
  ({
    endsAt: { gte: new Date(now.getTime() - FINISH_WINDOW_MS) },
  }) satisfies Prisma.RideWhereInput;

export const findFinishableRideForPilot = (
  rideId: string,
  userId: string,
  now: Date,
) =>
  prisma.ride.findFirst({
    where: { id: rideId, ...pilotRideWhere(userId), ...finishableAt(now) },
    select: calendarSelect,
  });

export const findLatestRideForPilot = (userId: string, now: Date) =>
  prisma.ride.findFirst({
    where: {
      ...pilotRideWhere(userId),
      ...finishableAt(now),
      status: { not: "cancelled" },
      startsAt: { lte: now },
    },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    select: pilotSelect,
  });
