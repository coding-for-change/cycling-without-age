import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import type { ReportScope, ReportSide } from "../report-zones";

const datetime = (instant: Date) =>
  instant.toISOString().slice(0, 23).replace("T", " ");

const chapterZoneJson = (scope: ReportScope) =>
  JSON.stringify(
    scope.chapterZones.map((c) => [
      c.chapterId,
      c.zone,
      datetime(c.firstInstant.current),
      datetime(c.firstInstant.previous),
    ]),
  );

const offsetLadder = (shifts: ReportScope["zoneShifts"][number]) =>
  shifts.length === 1
    ? Prisma.sql`${shifts[0].minutes}`
    : Prisma.sql`CASE ${Prisma.join(
        shifts
          .slice(0, -1)
          .map(
            (s) => Prisma.sql`WHEN r.startsAt < ${s.until} THEN ${s.minutes}`,
          ),
        " ",
      )} ELSE ${shifts[shifts.length - 1].minutes} END`;

const localOffset = (scope: ReportScope) =>
  Prisma.sql`CASE cz.zone ${Prisma.join(
    scope.zoneShifts.map(
      (shifts, zone) => Prisma.sql`WHEN ${zone} THEN ${offsetLadder(shifts)}`,
    ),
    " ",
  )} END`;

const inWindows = (scope: ReportScope) =>
  Prisma.join(
    [scope.windows.current, scope.windows.previous].map(
      (w) => Prisma.sql`(r.startsAt >= ${w.from} AND r.startsAt < ${w.to})`,
    ),
    " OR ",
  );

const bucketOf = (scope: ReportScope) => {
  const shifted =
    scope.shift.unit === "day"
      ? Prisma.sql`f.localDay + INTERVAL ${scope.shift.amount} DAY`
      : Prisma.sql`f.localDay + INTERVAL ${12 * scope.shift.amount} MONTH`;
  const aligned = Prisma.sql`IF(f.side = 'current', f.localDay, ${shifted})`;
  if (scope.grain === "day")
    return Prisma.sql`DATE_FORMAT(${aligned}, '%Y-%m-%d')`;
  if (scope.grain === "week")
    return Prisma.sql`DATE_FORMAT(${aligned} - INTERVAL WEEKDAY(${aligned}) DAY, '%Y-%m-%d')`;
  return Prisma.sql`DATE_FORMAT(${aligned}, '%Y-%m-01')`;
};

const riders = Prisma.sql`(SELECT COUNT(*) FROM ride_roster_entry e WHERE e.rideId = f.id)`;

const reportRides = (scope: ReportScope) => {
  const { current, previous } = scope.periods;
  return Prisma.sql`
    WITH chapter_zone AS (
      SELECT DISTINCT * FROM JSON_TABLE(${chapterZoneJson(scope)}, '$[*]' COLUMNS (
        chapterId VARCHAR(191) PATH '$[0]',
        zone INT PATH '$[1]',
        currentStart DATETIME(3) PATH '$[2]',
        previousStart DATETIME(3) PATH '$[3]'
      )) AS j
    ),
    dated AS (
      SELECT
        r.id,
        r.chapterId,
        r.model,
        CASE
          WHEN r.status = 'cancelled' THEN 'cancelled'
          WHEN r.endsAt < ${scope.now} THEN 'ridden'
        END AS kind,
        IF(r.status = 'cancelled', r.cancellationCategory, NULL) AS category,
        TIMESTAMPDIFF(MICROSECOND, r.startsAt, r.endsAt) DIV 1000 AS ms,
        DATE(r.startsAt + INTERVAL ${localOffset(scope)} MINUTE) AS localDay
      FROM ride r
      JOIN chapter_zone cz ON cz.chapterId = r.chapterId COLLATE utf8mb4_bin
      WHERE r.chapterId IN (${Prisma.join(scope.chapterIds)})
        AND (${inWindows(scope)})
    ),
    report_ride AS (
      SELECT * FROM (
        SELECT dated.*,
          CASE
            WHEN localDay >= CAST(${current.from} AS DATE) AND localDay < CAST(${current.to} AS DATE) THEN 'current'
            WHEN localDay >= CAST(${previous.from} AS DATE) AND localDay < CAST(${previous.to} AS DATE) THEN 'previous'
          END AS side
        FROM dated
      ) AS sided
      WHERE side IS NOT NULL AND kind IS NOT NULL
    )`;
};

export type BucketFactRow = {
  side: ReportSide;
  bucket: string;
  model: string;
  kind: "ridden" | "cancelled";
  category: string | null;
  trips: bigint;
  rides: bigint;
  ms: bigint;
};

export const findActivityBuckets = (scope: ReportScope) =>
  prisma.$queryRaw<BucketFactRow[]>`
    ${reportRides(scope)}
    SELECT
      f.side,
      ${bucketOf(scope)} AS bucket,
      f.model,
      f.kind,
      f.category,
      COUNT(*) AS trips,
      CAST(SUM(${riders}) AS SIGNED) AS rides,
      CAST(SUM(f.ms) AS SIGNED) AS ms
    FROM report_ride f
    GROUP BY f.side, bucket, f.model, f.kind, f.category`;

export type TallyFactRow = {
  key: string;
  side: ReportSide;
  trips: bigint;
  rides: bigint;
  ms: bigint;
};

export const findChapterTallies = (scope: ReportScope) =>
  prisma.$queryRaw<TallyFactRow[]>`
    ${reportRides(scope)}
    SELECT
      f.chapterId AS \`key\`,
      f.side,
      COUNT(*) AS trips,
      CAST(SUM(${riders}) AS SIGNED) AS rides,
      CAST(SUM(f.ms) AS SIGNED) AS ms
    FROM report_ride f
    WHERE f.kind = 'ridden'
    GROUP BY f.chapterId, f.side`;

export const findPilotTallies = (scope: ReportScope) =>
  prisma.$queryRaw<TallyFactRow[]>`
    ${reportRides(scope)}
    SELECT
      a.userId AS \`key\`,
      f.side,
      COUNT(*) AS trips,
      CAST(SUM(${riders}) AS SIGNED) AS rides,
      CAST(SUM(f.ms) AS SIGNED) AS ms
    FROM report_ride f
    JOIN ride_assignment a ON a.rideId = f.id AND a.role = 'pilot'
    WHERE f.kind = 'ridden'
    GROUP BY a.userId, f.side`;

export const findRiderTallies = (scope: ReportScope) =>
  prisma.$queryRaw<TallyFactRow[]>`
    ${reportRides(scope)}
    SELECT
      e.passengerId AS \`key\`,
      f.side,
      COUNT(*) AS trips,
      COUNT(*) AS rides,
      CAST(SUM(f.ms) AS SIGNED) AS ms
    FROM report_ride f
    JOIN ride_roster_entry e ON e.rideId = f.id
    WHERE f.kind = 'ridden'
    GROUP BY e.passengerId, f.side`;

export type RiderCountFactRow = {
  side: ReportSide;
  riders: bigint;
  newRiders: bigint;
};

const isNewRider = (scope: ReportScope) => Prisma.sql`
  NOT EXISTS (
    SELECT 1
    FROM ride_roster_entry e2
    JOIN ride r2 ON r2.id = e2.rideId
    LEFT JOIN chapter_zone cz2 ON cz2.chapterId = r2.chapterId COLLATE utf8mb4_bin
    WHERE e2.passengerId = d.passengerId
      AND r2.status <> 'cancelled'
      AND (
        r2.startsAt < IF(d.side = 'current', ${scope.windows.current.from}, ${scope.windows.previous.from})
        OR (
          cz2.chapterId IS NOT NULL
          AND r2.endsAt < ${scope.now}
          AND r2.startsAt < IF(d.side = 'current', cz2.currentStart, cz2.previousStart)
        )
      )
  )`;

export const findRiderCounts = (scope: ReportScope, withNewRiders: boolean) =>
  prisma.$queryRaw<RiderCountFactRow[]>`
    ${reportRides(scope)}
    SELECT
      d.side,
      COUNT(*) AS riders,
      ${withNewRiders ? Prisma.sql`CAST(SUM(${isNewRider(scope)}) AS SIGNED)` : Prisma.sql`0`} AS newRiders
    FROM (
      SELECT DISTINCT f.side, e.passengerId
      FROM report_ride f
      JOIN ride_roster_entry e ON e.rideId = f.id
      WHERE f.kind = 'ridden'
    ) AS d
    GROUP BY d.side`;

const ridden = (chapterIds: string[], since: Date, until: Date) => Prisma.sql`
  r.chapterId IN (${Prisma.join(chapterIds)})
  AND r.status <> 'cancelled'
  AND r.startsAt >= ${since}
  AND r.endsAt < ${until}`;

export const findActivePilots = (
  chapterIds: string[],
  since: Date,
  until: Date,
) =>
  prisma.$queryRaw<{ userId: string; chapterId: string }[]>`
    SELECT DISTINCT a.userId, r.chapterId
    FROM ride_assignment a
    JOIN ride r ON r.id = a.rideId
    WHERE a.role = 'pilot' AND ${ridden(chapterIds, since, until)}`;

export const countActiveRiders = async (
  chapterIds: string[],
  since: Date,
  until: Date,
) => {
  const [row] = await prisma.$queryRaw<{ riders: bigint }[]>`
    SELECT COUNT(DISTINCT e.passengerId) AS riders
    FROM ride_roster_entry e
    JOIN ride r ON r.id = e.rideId
    JOIN passenger p ON p.id = e.passengerId
    WHERE p.chapterId IN (${Prisma.join(chapterIds)})
      AND ${ridden(chapterIds, since, until)}`;
  return Number(row?.riders ?? 0);
};

export const findEarliestRideStart = async (chapterIds: string[]) =>
  (
    await prisma.ride.aggregate({
      where: { chapterId: { in: chapterIds } },
      _min: { startsAt: true },
    })
  )._min.startsAt;
