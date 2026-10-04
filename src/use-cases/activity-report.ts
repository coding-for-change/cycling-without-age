import { cacheLife, cacheTag } from "next/cache";
import { accounts } from "@/features/accounts";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import {
  localDate,
  periodBounds,
  resolveReportRange,
  rides,
  type ActivityAggregate,
  type ReportBucket,
  type ReportRange,
  type ReportRangeParams,
  type ReportTally,
} from "@/features/rides";

export const REPORTS_TAG = "reports";

export type ActivityReportParams = ReportRangeParams & {
  chapterIds: string[];
  includePeople: boolean;
  now?: string;
};

export type ReportChapter = {
  id: string;
  slug: string;
  name: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
  activePilots: number;
} & ReportTally;

export type ReportCountry = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  chapterCount: number;
  activePilots: number;
} & ReportTally;

export type ReportPerson = { id: string; name: string } & ReportTally;

export type ReportPeopleHealth = {
  activePilots: number;
  inactivePilots: number;
  activeRiders: number;
  inactiveRiders: number;
  newRiders: number;
};

export type ActivityReport = {
  range: ReportRange;
  timeZone: string;
  generatedAt: string;
  activeSince: string;
  totals: ActivityAggregate["totals"];
  series: ReportBucket[];
  cancellations: ActivityAggregate["cancellations"];
  models: ActivityAggregate["models"];
  chapters: ReportChapter[];
  countries: ReportCountry[];
  pilots: ReportPerson[] | null;
  riders: ReportPerson[] | null;
  people: ReportPeopleHealth;
};

export type ActivityKpis = Pick<
  ActivityReport,
  "range" | "timeZone" | "generatedAt" | "totals" | "series"
>;

const ranked = <T extends ReportTally & { name: string }>(rows: T[]) =>
  rows.sort(
    (a, b) =>
      b.rides - a.rides ||
      b.hours - a.hours ||
      b.trips - a.trips ||
      a.name.localeCompare(b.name),
  );

const yearBefore = (now: Date) => {
  const since = new Date(now);
  since.setUTCFullYear(since.getUTCFullYear() - 1);
  return since;
};

const addTally = (into: ReportTally, from: ReportTally) => {
  into.rides += from.rides;
  into.trips += from.trips;
  into.hours = Math.round((into.hours + from.hours) * 10) / 10;
  into.previousRides += from.previousRides;
  into.previousTrips += from.previousTrips;
  into.previousHours =
    Math.round((into.previousHours + from.previousHours) * 10) / 10;
};

const zeroTally = (): ReportTally => ({
  rides: 0,
  trips: 0,
  hours: 0,
  previousRides: 0,
  previousTrips: 0,
  previousHours: 0,
});

const NO_PEOPLE = {
  active: { pilots: [], passengers: [] },
  pilotMembers: [],
  riderRows: [],
};

async function buildReport(
  params: ActivityReportParams,
  { withHealth }: { withHealth: boolean },
): Promise<ActivityReport> {
  const meta = await chapters.listChapterReportMeta(params.chapterIds);
  const chapterIds = meta.map((c) => c.id);
  const zones = [...new Set(meta.map((c) => c.timeZone))];
  const timeZone = zones.length === 1 ? zones[0] : "UTC";
  const now = params.now ? new Date(params.now) : new Date();
  const today = localDate(now, timeZone);

  const earliest =
    params.range === "all" && !params.from && !params.to
      ? await rides.earliestRideStart(chapterIds)
      : null;
  const range = resolveReportRange(params, {
    today,
    earliest: earliest ? localDate(earliest, timeZone) : null,
  });

  const current = periodBounds(range);
  const previous = periodBounds(range.previous);
  const activeSince = yearBefore(now);

  const [currentFacts, previousFacts, { active, pilotMembers, riderRows }] =
    await Promise.all([
      rides.activityFacts(chapterIds, current.from, current.to),
      rides.activityFacts(chapterIds, previous.from, previous.to),
      withHealth
        ? Promise.all([
            rides.activeParticipants(chapterIds, activeSince, now),
            membership.listPilotMembers(chapterIds),
            passengers.listPassengerIdsOfChapters(chapterIds),
          ]).then(([active, pilotMembers, riderRows]) => ({
            active,
            pilotMembers,
            riderRows,
          }))
        : NO_PEOPLE,
    ]);

  const passengerIdsOf = (facts: typeof currentFacts) => [
    ...new Set(facts.flatMap((f) => f.passengerIds)),
  ];
  const [ridersBeforeCurrent, ridersBeforePrevious] = await Promise.all([
    rides.passengersWithRideBefore(passengerIdsOf(currentFacts), current.from),
    rides.passengersWithRideBefore(
      passengerIdsOf(previousFacts),
      previous.from,
    ),
  ]);

  const aggregate = rides.aggregateActivity({
    current: currentFacts,
    previous: previousFacts,
    tzByChapter: Object.fromEntries(meta.map((c) => [c.id, c.timeZone])),
    range,
    now,
    ridersBeforeCurrent,
    ridersBeforePrevious,
  });

  const health = rides.peopleHealth(
    {
      pilots: pilotMembers,
      passengers: riderRows,
    },
    active,
  );

  const chapterRows: ReportChapter[] = meta.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    countryCode: c.country.code,
    countryName: c.country.name,
    lat: c.latitude,
    lng: c.longitude,
    activePilots: health.activePilotsByChapter[c.id] ?? 0,
    ...(aggregate.chapters[c.id] ?? zeroTally()),
  }));

  const countryMap = new Map<
    string,
    ReportCountry & { sumLat: number; sumLng: number }
  >();
  for (const chapter of chapterRows) {
    const country = countryMap.get(chapter.countryCode) ?? {
      code: chapter.countryCode,
      name: chapter.countryName,
      lat: 0,
      lng: 0,
      sumLat: 0,
      sumLng: 0,
      chapterCount: 0,
      activePilots: 0,
      ...zeroTally(),
    };
    country.chapterCount += 1;
    country.activePilots += chapter.activePilots;
    country.sumLat += chapter.lat;
    country.sumLng += chapter.lng;
    addTally(country, chapter);
    countryMap.set(chapter.countryCode, country);
  }
  const countries = ranked(
    [...countryMap.values()].map(({ sumLat, sumLng, ...country }) => ({
      ...country,
      lat: sumLat / country.chapterCount,
      lng: sumLng / country.chapterCount,
    })),
  );

  let pilots: ReportPerson[] | null = null;
  let riders: ReportPerson[] | null = null;
  if (params.includePeople && chapterIds.length === 1) {
    const [pilotNames, riderNames] = await Promise.all([
      accounts.displayNames(Object.keys(aggregate.pilots)),
      passengers.passengerNames(Object.keys(aggregate.riders)),
    ]);
    pilots = ranked(
      Object.entries(aggregate.pilots).map(([id, tally]) => ({
        id,
        name: pilotNames[id] ?? "",
        ...tally,
      })),
    );
    riders = ranked(
      Object.entries(aggregate.riders).map(([id, tally]) => ({
        id,
        name: riderNames[id] ?? "",
        ...tally,
      })),
    );
  }

  return {
    range,
    timeZone,
    generatedAt: now.toISOString(),
    activeSince: activeSince.toISOString(),
    totals: aggregate.totals,
    series: aggregate.series,
    cancellations: aggregate.cancellations,
    models: aggregate.models,
    chapters: ranked(chapterRows),
    countries,
    pilots,
    riders,
    people: {
      activePilots: health.activePilots,
      inactivePilots: health.inactivePilots,
      activeRiders: health.activeRiders,
      inactiveRiders: health.inactiveRiders,
      newRiders: aggregate.totals.newRiders.current,
    },
  };
}

export async function activityReport(
  params: ActivityReportParams,
): Promise<ActivityReport> {
  "use cache";
  cacheTag(REPORTS_TAG);
  cacheLife("minutes");
  return buildReport(params, { withHealth: true });
}

export async function activityKpis(
  chapterIds: string[],
): Promise<ActivityKpis> {
  "use cache";
  cacheTag(REPORTS_TAG);
  cacheLife("minutes");
  const report = await buildReport(
    { chapterIds, includePeople: false, range: "30d" },
    { withHealth: false },
  );
  return {
    range: report.range,
    timeZone: report.timeZone,
    generatedAt: report.generatedAt,
    totals: report.totals,
    series: report.series,
  };
}
