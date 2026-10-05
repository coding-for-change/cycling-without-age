import { cacheLife, cacheTag } from "next/cache";
import { accounts } from "@/features/accounts";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { passengers } from "@/features/passengers";
import {
  resolveReportRange,
  rides,
  type ActivityAggregate,
  type ReportBucket,
  type ReportMetric,
  type ReportRange,
  type ReportRangeParams,
  type ReportScope,
  type ReportTally,
  type ReportTotals,
} from "@/features/rides";
import { reportCacheTags } from "@/lib/cache-tags";
import { dayKey } from "@/lib/calendar";

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
  activePilots: number;
} & ReportTally;

export type ReportPerson = { id: string; name: string } & ReportTally;

export type ReportPeopleHealth = {
  activePilots: number;
  inactivePilots: number;
  activeRiders: number;
  inactiveRiders: number;
};

export type ActivityReport = {
  range: ReportRange;
  timeZone: string;
  generatedAt: string;
  totals: ReportTotals & { newRiders: ReportMetric };
  series: ReportBucket[];
  cancellations: ActivityAggregate["cancellations"];
  models: ActivityAggregate["models"];
  chapters: ReportChapter[];
  countries: ReportCountry[];
  pilots: ReportPerson[] | null;
  riders: ReportPerson[] | null;
  people: ReportPeopleHealth;
};

export type ActivityKpis = {
  range: ReportRange;
  timeZone: string;
  generatedAt: string;
  totals: ReportTotals;
  series: ReportBucket[];
};

async function resolveScope(params: ActivityReportParams, now: Date) {
  const wantsEarliest = params.range === "all" && !params.from && !params.to;
  const [meta, earliest] = await Promise.all([
    chapters.listChapterReportMeta(params.chapterIds),
    wantsEarliest ? rides.earliestRideStart(params.chapterIds) : null,
  ]);
  const zones = [...new Set(meta.map((c) => c.timeZone))];
  const timeZone = zones.length === 1 ? zones[0] : "UTC";
  const range = resolveReportRange(params, {
    today: dayKey(now, timeZone),
    earliest: earliest ? dayKey(earliest, timeZone) : null,
  });
  return {
    meta,
    timeZone,
    range,
    scope: rides.reportScope(meta, range, now),
  };
}

const named = (
  table: Record<string, ReportTally>,
  names: Record<string, string>,
): ReportPerson[] =>
  rides.ranked(
    Object.entries(table).map(([id, tally]) => ({
      id,
      name: names[id] ?? "",
      ...tally,
    })),
  );

async function rankedPeople(scope: ReportScope) {
  const tallies = await rides.peopleTallies(scope);
  const [pilotNames, riderNames] = await Promise.all([
    accounts.displayNames(Object.keys(tallies.pilots)),
    passengers.passengerNames(Object.keys(tallies.riders)),
  ]);
  return {
    pilots: named(tallies.pilots, pilotNames),
    riders: named(tallies.riders, riderNames),
  };
}

async function buildReport(
  params: ActivityReportParams,
): Promise<ActivityReport> {
  const now = params.now ? new Date(params.now) : new Date();
  const scoped = resolveScope(params, now);

  const [
    { meta, timeZone, range },
    facts,
    people,
    [active, pilotMembers, riderCount],
  ] = await Promise.all([
    scoped,
    scoped.then(({ scope }) => rides.activityFacts(scope, { extras: true })),
    scoped.then(({ meta, scope }) =>
      params.includePeople && meta.length === 1 ? rankedPeople(scope) : null,
    ),
    Promise.all([
      rides.activeParticipants(params.chapterIds, rides.yearBefore(now), now),
      membership.listPilotMembers(params.chapterIds),
      passengers.countPassengersOfChapters(params.chapterIds),
    ]),
  ]);

  const aggregate = rides.aggregateActivity({ range, ...facts });
  const health = rides.peopleHealth(
    { pilots: pilotMembers, riders: riderCount },
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
    ...(aggregate.chapters[c.id] ?? rides.emptyTally()),
  }));

  return {
    range,
    timeZone,
    generatedAt: now.toISOString(),
    totals: { ...aggregate.totals, newRiders: rides.newRiders(facts.riders) },
    series: aggregate.series,
    cancellations: aggregate.cancellations,
    models: aggregate.models,
    chapters: rides.ranked(chapterRows),
    countries: rides.countryRollup(chapterRows),
    pilots: people?.pilots ?? null,
    riders: people?.riders ?? null,
    people: {
      activePilots: health.activePilots,
      inactivePilots: health.inactivePilots,
      activeRiders: health.activeRiders,
      inactiveRiders: health.inactiveRiders,
    },
  };
}

async function buildKpis(chapterIds: string[]): Promise<ActivityKpis> {
  const now = new Date();
  const { timeZone, range, scope } = await resolveScope(
    { chapterIds, includePeople: false, range: "30d" },
    now,
  );
  const facts = await rides.activityFacts(scope, { extras: false });
  const { totals, series } = rides.aggregateActivity({ range, ...facts });
  return {
    range,
    timeZone,
    generatedAt: now.toISOString(),
    totals,
    series,
  };
}

export async function activityReport(
  params: ActivityReportParams,
): Promise<ActivityReport> {
  "use cache";
  cacheTag(...reportCacheTags(params.chapterIds));
  cacheLife("minutes");
  return buildReport(params);
}

export async function activityKpis(
  chapterIds: string[],
): Promise<ActivityKpis> {
  "use cache";
  cacheTag(...reportCacheTags(chapterIds));
  cacheLife("minutes");
  return buildKpis(chapterIds);
}
