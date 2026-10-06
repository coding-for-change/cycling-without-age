import type { ReportTally } from "@/features/rides/report";

export type RankingTab = "chapters" | "countries" | "pilots" | "riders";

export type RankMetric = "rides" | "hours" | "perPilot";

export type ScopeKind = "all" | "country" | "chapter";

export const RANK_PARAM = "rank";
export const RANKING_PARAM = "ranking";

const TIMEFRAME_PARAMS = ["range", "from", "to", "metric", RANK_PARAM];

export function rankingTabs(
  scope: ScopeKind,
  countryCount: number,
): RankingTab[] {
  if (scope === "chapter") return ["pilots", "riders"];
  if (scope === "country" || countryCount < 2) return ["chapters"];
  return ["chapters", "countries"];
}

export const metricsFor = (tab: RankingTab): RankMetric[] =>
  tab === "chapters" ? ["rides", "hours", "perPilot"] : ["rides", "hours"];

export function parseRankMetric(
  value: string | null | undefined,
  tab: RankingTab,
): RankMetric {
  const allowed = metricsFor(tab);
  return allowed.find((metric) => metric === value) ?? "rides";
}

export const parseRankingTab = (
  value: string | null | undefined,
  tabs: RankingTab[],
): RankingTab | null => tabs.find((tab) => tab === value) ?? null;

type Rankable = ReportTally & { activePilots?: number };

const perPilot = (rides: number, pilots: number | undefined) =>
  pilots && pilots > 0 ? Math.round((rides / pilots) * 10) / 10 : null;

export function metricValue(
  row: Rankable,
  metric: RankMetric,
): { current: number | null; previous: number | null } {
  if (metric === "hours")
    return { current: row.hours, previous: row.previousHours };
  if (metric === "perPilot")
    return {
      current: perPilot(row.rides, row.activePilots),
      previous: perPilot(row.previousRides, row.activePilots),
    };
  return { current: row.rides, previous: row.previousRides };
}

export const relativeChange = (current: number, previous: number) =>
  previous === 0 ? null : (current - previous) / previous;

export type RankedRow<T> = {
  row: T;
  rank: number;
  movement: number | null;
  value: number;
  share: number;
};

const order = <T>(
  rows: T[],
  value: (row: T) => number | null,
): { row: T; value: number }[] =>
  rows
    .map((row, index) => ({ row, value: value(row), index }))
    .filter(
      (entry): entry is { row: T; value: number; index: number } =>
        entry.value !== null && entry.value > 0,
    )
    .sort((a, b) => b.value - a.value || a.index - b.index);

export function rankRows<T>(
  rows: T[],
  current: (row: T) => number | null,
  previous: (row: T) => number | null,
): RankedRow<T>[] {
  const ranked = order(rows, current);
  const before = new Map(
    order(rows, previous).map((entry, index) => [entry.row, index + 1]),
  );
  const max = ranked[0]?.value ?? 0;

  return ranked.map((entry, index) => {
    const rank = index + 1;
    const previousRank = before.get(entry.row) ?? null;
    return {
      row: entry.row,
      rank,
      movement: previousRank === null ? null : previousRank - rank,
      value: entry.value,
      share: max > 0 ? entry.value / max : 0,
    };
  });
}

export function rescopeHref(
  pathname: string,
  search: URLSearchParams | string,
  scope: { chapter: string } | { country: string },
) {
  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  for (const key of TIMEFRAME_PARAMS) {
    const value = current.get(key);
    if (value) next.set(key, value);
  }
  if ("chapter" in scope) next.set("chapter", scope.chapter);
  else next.set("country", scope.country);
  return `${pathname}?${next.toString()}`;
}
