import {
  bucketKey,
  bucketKeys,
  localDate,
  shiftForward,
  type ReportRange,
} from "./report-range";
import {
  RIDE_CANCELLATION_CATEGORIES,
  RIDE_MODELS,
  type RideCancellationCategoryName,
  type RideModelName,
  type RideStatusName,
} from "./schemas";

export type ReportFact = {
  id: string;
  chapterId: string;
  model: RideModelName;
  status: RideStatusName;
  startsAt: Date;
  endsAt: Date;
  cancellationCategory: RideCancellationCategoryName | null;
  pilotIds: string[];
  passengerIds: string[];
};

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

export type ModelCounts = Record<RideModelName, number> & { total: number };

export type ReportCancellationKey =
  RideCancellationCategoryName | "uncategorised";

export const REPORT_CANCELLATION_KEYS: ReportCancellationKey[] = [
  ...RIDE_CANCELLATION_CATEGORIES,
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

export type ActivityAggregate = {
  totals: {
    rides: ReportMetric;
    trips: ReportMetric;
    riders: ReportMetric;
    hours: ReportMetric;
    cancellations: ReportMetric;
    cancellationRate: ReportRateMetric;
    newRiders: ReportMetric;
  };
  series: ReportBucket[];
  cancellations: {
    category: ReportCancellationKey;
    count: number;
    previous: number;
  }[];
  models: {
    model: RideModelName;
    rides: number;
    trips: number;
    hours: number;
    previousRides: number;
  }[];
  chapters: Record<string, ReportTally>;
  pilots: Record<string, ReportTally>;
  riders: Record<string, ReportTally>;
  newRiderIds: string[];
};

export type AggregateInput = {
  current: ReportFact[];
  previous: ReportFact[];
  tzByChapter: Record<string, string>;
  range: ReportRange;
  now: Date;
  ridersBeforeCurrent: string[];
  ridersBeforePrevious: string[];
};

const roundHours = (hours: number) => Math.round(hours * 10) / 10;

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

const emptyTally = (): ReportTally => ({
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

const tally = (
  table: Record<string, ReportTally>,
  key: string,
  side: "current" | "previous",
  rides: number,
  hours: number,
) => {
  const row = (table[key] ??= emptyTally());
  if (side === "current") {
    row.rides += rides;
    row.trips += 1;
    row.hours += hours;
  } else {
    row.previousRides += rides;
    row.previousTrips += 1;
    row.previousHours += hours;
  }
};

const roundTally = (table: Record<string, ReportTally>) => {
  for (const row of Object.values(table)) {
    row.hours = roundHours(row.hours);
    row.previousHours = roundHours(row.previousHours);
  }
  return table;
};

type Side = {
  rides: number;
  trips: number;
  hours: number;
  cancellations: number;
  riders: Set<string>;
  byCategory: Record<ReportCancellationKey, number>;
  byModel: Record<
    RideModelName,
    { rides: number; trips: number; hours: number }
  >;
};

const emptySide = (): Side => ({
  rides: 0,
  trips: 0,
  hours: 0,
  cancellations: 0,
  riders: new Set(),
  byCategory: Object.fromEntries(
    REPORT_CANCELLATION_KEYS.map((key) => [key, 0]),
  ) as Record<ReportCancellationKey, number>,
  byModel: Object.fromEntries(
    RIDE_MODELS.map((model) => [model, { rides: 0, trips: 0, hours: 0 }]),
  ) as Side["byModel"],
});

const isRidden = (fact: ReportFact, now: Date) =>
  fact.status !== "cancelled" && fact.endsAt.getTime() < now.getTime();

const tripHours = (fact: ReportFact) =>
  (fact.endsAt.getTime() - fact.startsAt.getTime()) / 3_600_000;

const newRidersOf = (side: Side, before: Set<string>) =>
  [...side.riders].filter((id) => !before.has(id));

export function aggregateActivity(input: AggregateInput): ActivityAggregate {
  const { range, now, tzByChapter } = input;
  const keys = bucketKeys(range, range.grain);
  const buckets = new Map<string, ReportBucket>(
    keys.map((start) => [
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
  const chapters: Record<string, ReportTally> = {};
  const pilots: Record<string, ReportTally> = {};
  const riders: Record<string, ReportTally> = {};
  const beforeCurrent = new Set(input.ridersBeforeCurrent);
  const beforePrevious = new Set(input.ridersBeforePrevious);

  const periods = {
    current: { from: range.from, to: range.to },
    previous: range.previous,
  };

  const seen = new Set<string>();
  for (const fact of [...input.current, ...input.previous]) {
    if (seen.has(fact.id)) continue;
    seen.add(fact.id);

    const date = localDate(fact.startsAt, tzByChapter[fact.chapterId] ?? "UTC");
    const ridden = isRidden(fact, now);

    if (ridden) {
      if (date < periods.current.from)
        fact.passengerIds.forEach((id) => beforeCurrent.add(id));
      if (date < periods.previous.from)
        fact.passengerIds.forEach((id) => beforePrevious.add(id));
    }

    const which =
      date >= periods.current.from && date < periods.current.to
        ? "current"
        : date >= periods.previous.from && date < periods.previous.to
          ? "previous"
          : null;
    if (!which) continue;

    const side = sides[which];
    const bucket = buckets.get(
      bucketKey(
        which === "current" ? date : shiftForward(date, range.shift),
        range.grain,
      ),
    );

    if (fact.status === "cancelled") {
      side.cancellations += 1;
      side.byCategory[fact.cancellationCategory ?? "uncategorised"] += 1;
      if (bucket && which === "current")
        bump(bucket.cancellations, fact.model, 1);
      if (bucket && which === "previous") bucket.previous.cancellations += 1;
      continue;
    }
    if (!ridden) continue;

    const rides = fact.passengerIds.length;
    const hours = tripHours(fact);
    side.rides += rides;
    side.trips += 1;
    side.hours += hours;
    side.byModel[fact.model].rides += rides;
    side.byModel[fact.model].trips += 1;
    side.byModel[fact.model].hours += hours;
    for (const id of fact.passengerIds) side.riders.add(id);

    if (bucket && which === "current") {
      bump(bucket.rides, fact.model, rides);
      bump(bucket.trips, fact.model, 1);
      bump(bucket.hours, fact.model, hours);
    }
    if (bucket && which === "previous") {
      bucket.previous.rides += rides;
      bucket.previous.trips += 1;
      bucket.previous.hours += hours;
    }

    tally(chapters, fact.chapterId, which, rides, hours);
    for (const id of new Set(fact.pilotIds))
      tally(pilots, id, which, rides, hours);
    for (const id of new Set(fact.passengerIds))
      tally(riders, id, which, 1, hours);
  }

  const { current, previous } = sides;
  const newRiderIds = newRidersOf(current, beforeCurrent);
  const previousNewRiders = newRidersOf(previous, beforePrevious).length;

  const series = [...buckets.values()].map((bucket) => {
    for (const model of RIDE_MODELS)
      bucket.hours[model] = roundHours(bucket.hours[model]);
    bucket.hours.total = roundHours(bucket.hours.total);
    bucket.previous.hours = roundHours(bucket.previous.hours);
    return bucket;
  });

  return {
    totals: {
      rides: metric(current.rides, previous.rides),
      trips: metric(current.trips, previous.trips),
      riders: metric(current.riders.size, previous.riders.size),
      hours: metric(roundHours(current.hours), roundHours(previous.hours)),
      cancellations: metric(current.cancellations, previous.cancellations),
      cancellationRate: rateMetric(
        rate(current.cancellations, current.cancellations + current.trips),
        rate(previous.cancellations, previous.cancellations + previous.trips),
      ),
      newRiders: metric(newRiderIds.length, previousNewRiders),
    },
    series,
    cancellations: REPORT_CANCELLATION_KEYS.map((category) => ({
      category,
      count: current.byCategory[category],
      previous: previous.byCategory[category],
    })),
    models: RIDE_MODELS.map((model) => ({
      model,
      rides: current.byModel[model].rides,
      trips: current.byModel[model].trips,
      hours: roundHours(current.byModel[model].hours),
      previousRides: previous.byModel[model].rides,
    })),
    chapters: roundTally(chapters),
    pilots: roundTally(pilots),
    riders: roundTally(riders),
    newRiderIds,
  };
}

export type ActiveParticipantRows = {
  pilots: { userId: string; chapterId: string }[];
  passengers: { passengerId: string; chapterId: string }[];
};

export function peopleHealth(
  roster: {
    pilots: { userId: string; chapterId: string }[];
    passengers: { id: string; chapterId: string }[];
  },
  active: ActiveParticipantRows,
) {
  const activePilotKeys = new Set(
    active.pilots.map((p) => `${p.chapterId}:${p.userId}`),
  );
  const activePassengers = new Set(active.passengers.map((p) => p.passengerId));

  const pilotIds = new Set(roster.pilots.map((p) => p.userId));
  const activePilotIds = new Set(
    roster.pilots
      .filter((p) => activePilotKeys.has(`${p.chapterId}:${p.userId}`))
      .map((p) => p.userId),
  );
  const activePilotsByChapter: Record<string, number> = {};
  for (const p of roster.pilots)
    if (activePilotKeys.has(`${p.chapterId}:${p.userId}`))
      activePilotsByChapter[p.chapterId] =
        (activePilotsByChapter[p.chapterId] ?? 0) + 1;

  const riderIds = new Set(roster.passengers.map((p) => p.id));
  const activeRiders = [...riderIds].filter((id) => activePassengers.has(id));

  return {
    activePilots: activePilotIds.size,
    inactivePilots: pilotIds.size - activePilotIds.size,
    activeRiders: activeRiders.length,
    inactiveRiders: riderIds.size - activeRiders.length,
    activePilotsByChapter,
  };
}
