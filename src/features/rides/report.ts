import { bucketKeys, type ReportRange } from "./report-range";
import type { ReportSide } from "./report-zones";
import {
  RIDE_CANCELLATION_REASONS,
  RIDE_MODELS,
  type RideCancellationReasonName,
  type RideModelName,
} from "./schemas";

export type ReportMetric = {
  current: number;
  previous: number;
  delta: number | null;
};

export type ReportRateMetric = {
  current: number | null;
  previous: number | null;
  deltaPoints: number | null;
};

type ModelCounts = Record<RideModelName, number> & { total: number };

export type ReportCancellationKey =
  RideCancellationReasonName | "uncategorised";

const REPORT_CANCELLATION_KEYS: ReportCancellationKey[] = [
  ...RIDE_CANCELLATION_REASONS,
  "uncategorised",
];

export type ReportBucket = {
  start: string;
  rides: ModelCounts;
  trips: ModelCounts;
  hours: ModelCounts;
  cancellations: ModelCounts;
  previous: {
    rides: number;
    trips: number;
    hours: number;
    cancellations: number;
  };
};

export type ReportTally = {
  rides: number;
  trips: number;
  hours: number;
  previousRides: number;
  previousTrips: number;
  previousHours: number;
};

export type ReportTotals = {
  rides: ReportMetric;
  trips: ReportMetric;
  riders: ReportMetric;
  hours: ReportMetric;
  cancellations: ReportMetric;
  cancellationRate: ReportRateMetric;
};

export type ActivityAggregate = {
  totals: ReportTotals;
  series: ReportBucket[];
  cancellations: {
    category: ReportCancellationKey;
    count: number;
  }[];
  models: {
    model: RideModelName;
    rides: number;
    hours: number;
    previousRides: number;
  }[];
  chapters: Record<string, ReportTally>;
};

export type ActivityBucketRow = {
  side: ReportSide;
  bucket: string;
  model: RideModelName;
  kind: "ridden" | "cancelled";
  category: RideCancellationReasonName | null;
  trips: number;
  rides: number;
  ms: number;
};

export type ActivityTallyRow = {
  key: string;
  side: ReportSide;
  trips: number;
  rides: number;
  ms: number;
};

export type RiderCountRow = {
  side: ReportSide;
  riders: number;
  newRiders: number;
};

export type ActivityFacts = {
  buckets: ActivityBucketRow[];
  chapters: ActivityTallyRow[];
  riders: RiderCountRow[];
};

const MS_PER_HOUR = 3_600_000;

const roundHours = (hours: number) => Math.round(hours * 10) / 10;

const hoursOf = (ms: number) => roundHours(ms / MS_PER_HOUR);

export const metric = (current: number, previous: number): ReportMetric => ({
  current,
  previous,
  delta: previous === 0 ? null : (current - previous) / previous,
});

const rate = (part: number, whole: number) =>
  whole === 0 ? null : part / whole;

const rateMetric = (
  current: number | null,
  previous: number | null,
): ReportRateMetric => ({
  current,
  previous,
  deltaPoints:
    current === null || previous === null ? null : current - previous,
});

const emptyModels = (): ModelCounts => ({
  event: 0,
  pleasure: 0,
  functional: 0,
  total: 0,
});

export const emptyTally = (): ReportTally => ({
  rides: 0,
  trips: 0,
  hours: 0,
  previousRides: 0,
  previousTrips: 0,
  previousHours: 0,
});

const bump = (counts: ModelCounts, model: RideModelName, by: number) => {
  counts[model] += by;
  counts.total += by;
};

const toHours = (counts: ModelCounts) => {
  for (const model of RIDE_MODELS) counts[model] = hoursOf(counts[model]);
  counts.total = hoursOf(counts.total);
};

type Side = {
  rides: number;
  trips: number;
  ms: number;
  cancellations: number;
  byCategory: Record<ReportCancellationKey, number>;
  byModel: Record<RideModelName, { rides: number; ms: number }>;
};

const emptySide = (): Side => ({
  rides: 0,
  trips: 0,
  ms: 0,
  cancellations: 0,
  byCategory: Object.fromEntries(
    REPORT_CANCELLATION_KEYS.map((key) => [key, 0]),
  ) as Record<ReportCancellationKey, number>,
  byModel: Object.fromEntries(
    RIDE_MODELS.map((model) => [model, { rides: 0, ms: 0 }]),
  ) as Side["byModel"],
});

export function tallies(rows: ActivityTallyRow[]): Record<string, ReportTally> {
  const ms: Record<string, { current: number; previous: number }> = {};
  const table: Record<string, ReportTally> = {};
  for (const row of rows) {
    const tally = (table[row.key] ??= emptyTally());
    const spent = (ms[row.key] ??= { current: 0, previous: 0 });
    spent[row.side] += row.ms;
    if (row.side === "current") {
      tally.rides += row.rides;
      tally.trips += row.trips;
    } else {
      tally.previousRides += row.rides;
      tally.previousTrips += row.trips;
    }
  }
  for (const [key, spent] of Object.entries(ms)) {
    table[key].hours = hoursOf(spent.current);
    table[key].previousHours = hoursOf(spent.previous);
  }
  return table;
}

const countsBySide = (rows: RiderCountRow[], field: "riders" | "newRiders") =>
  metric(
    rows.find((row) => row.side === "current")?.[field] ?? 0,
    rows.find((row) => row.side === "previous")?.[field] ?? 0,
  );

export const newRiders = (rows: RiderCountRow[]) =>
  countsBySide(rows, "newRiders");

export function aggregateActivity({
  range,
  buckets: rows,
  chapters,
  riders,
}: ActivityFacts & { range: ReportRange }): ActivityAggregate {
  const buckets = new Map<string, ReportBucket>(
    bucketKeys(range, range.grain).map((start) => [
      start,
      {
        start,
        rides: emptyModels(),
        trips: emptyModels(),
        hours: emptyModels(),
        cancellations: emptyModels(),
        previous: { rides: 0, trips: 0, hours: 0, cancellations: 0 },
      },
    ]),
  );
  const sides = { current: emptySide(), previous: emptySide() };

  for (const row of rows) {
    const side = sides[row.side];
    const bucket = buckets.get(row.bucket);

    if (row.kind === "cancelled") {
      side.cancellations += row.trips;
      side.byCategory[row.category ?? "uncategorised"] += row.trips;
      if (bucket && row.side === "current")
        bump(bucket.cancellations, row.model, row.trips);
      if (bucket && row.side === "previous")
        bucket.previous.cancellations += row.trips;
      continue;
    }

    side.rides += row.rides;
    side.trips += row.trips;
    side.ms += row.ms;
    side.byModel[row.model].rides += row.rides;
    side.byModel[row.model].ms += row.ms;

    if (bucket && row.side === "current") {
      bump(bucket.rides, row.model, row.rides);
      bump(bucket.trips, row.model, row.trips);
      bump(bucket.hours, row.model, row.ms);
    }
    if (bucket && row.side === "previous") {
      bucket.previous.rides += row.rides;
      bucket.previous.trips += row.trips;
      bucket.previous.hours += row.ms;
    }
  }

  const series = [...buckets.values()].map((bucket) => {
    toHours(bucket.hours);
    bucket.previous.hours = hoursOf(bucket.previous.hours);
    return bucket;
  });

  const { current, previous } = sides;
  return {
    totals: {
      rides: metric(current.rides, previous.rides),
      trips: metric(current.trips, previous.trips),
      riders: countsBySide(riders, "riders"),
      hours: metric(hoursOf(current.ms), hoursOf(previous.ms)),
      cancellations: metric(current.cancellations, previous.cancellations),
      cancellationRate: rateMetric(
        rate(current.cancellations, current.cancellations + current.trips),
        rate(previous.cancellations, previous.cancellations + previous.trips),
      ),
    },
    series,
    cancellations: REPORT_CANCELLATION_KEYS.map((category) => ({
      category,
      count: current.byCategory[category],
    })),
    models: RIDE_MODELS.map((model) => ({
      model,
      rides: current.byModel[model].rides,
      hours: hoursOf(current.byModel[model].ms),
      previousRides: previous.byModel[model].rides,
    })),
    chapters: tallies(chapters),
  };
}

type Rankable = ReportTally & { name: string; id?: string; code?: string };

const tieKey = (row: Rankable) => row.id ?? row.code ?? "";

export const ranked = <T extends Rankable>(rows: T[]) =>
  rows.sort(
    (a, b) =>
      b.rides - a.rides ||
      b.hours - a.hours ||
      b.trips - a.trips ||
      a.name.localeCompare(b.name) ||
      tieKey(a).localeCompare(tieKey(b)),
  );

export const addTally = (into: ReportTally, from: ReportTally) => {
  into.rides += from.rides;
  into.trips += from.trips;
  into.hours = roundHours(into.hours + from.hours);
  into.previousRides += from.previousRides;
  into.previousTrips += from.previousTrips;
  into.previousHours = roundHours(into.previousHours + from.previousHours);
};

export function countryRollup<
  T extends ReportTally & {
    countryCode: string;
    countryName: string;
    activePilots: number;
  },
>(chapters: T[]) {
  const countries = new Map<
    string,
    ReportTally & { code: string; name: string; activePilots: number }
  >();
  for (const chapter of chapters) {
    const country = countries.get(chapter.countryCode) ?? {
      code: chapter.countryCode,
      name: chapter.countryName,
      activePilots: 0,
      ...emptyTally(),
    };
    country.activePilots += chapter.activePilots;
    addTally(country, chapter);
    countries.set(chapter.countryCode, country);
  }
  return ranked([...countries.values()]);
}

export const yearBefore = (now: Date) => {
  const since = new Date(now);
  since.setUTCFullYear(since.getUTCFullYear() - 1);
  return since;
};

export type PilotMembership = { userId: string; chapterId: string };

export function peopleHealth(
  roster: { pilots: PilotMembership[]; riders: number },
  active: { pilots: PilotMembership[]; riders: number },
) {
  const activePilotKeys = new Set(
    active.pilots.map((p) => `${p.chapterId}:${p.userId}`),
  );
  const pilotIds = new Set(roster.pilots.map((p) => p.userId));
  const activePilotIds = new Set<string>();
  const activePilotsByChapter: Record<string, number> = {};
  for (const p of roster.pilots) {
    if (!activePilotKeys.has(`${p.chapterId}:${p.userId}`)) continue;
    activePilotIds.add(p.userId);
    activePilotsByChapter[p.chapterId] =
      (activePilotsByChapter[p.chapterId] ?? 0) + 1;
  }

  return {
    activePilots: activePilotIds.size,
    inactivePilots: pilotIds.size - activePilotIds.size,
    activeRiders: active.riders,
    inactiveRiders: roster.riders - active.riders,
    activePilotsByChapter,
  };
}
