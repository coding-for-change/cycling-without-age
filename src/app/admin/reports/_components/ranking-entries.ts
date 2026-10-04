import type { ReportTally } from "@/features/rides/report";
import type { Dictionary } from "@/lib/i18n";
import { formatNumber, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale as Language } from "@/lib/i18n/locales";
import {
  chapterKey,
  countryKey,
  type HighlightKey,
} from "./highlight-provider";
import {
  metricValue,
  rankRows,
  rescopeHref,
  type RankMetric,
  type RankingTab,
  type ScopeKind,
} from "./ranking-model";

export type RankingsStrings = Dictionary["admin"]["reports"]["rankings"];

export type RankingChapter = ReportTally & {
  id: string;
  slug: string;
  name: string;
  countryName: string;
  activePilots: number;
};

export type RankingCountry = ReportTally & {
  code: string;
  name: string;
  activePilots: number;
};

export type RankingPerson = ReportTally & { id: string; name: string };

export type RankingEntry = {
  key: string;
  name: string;
  detail?: string;
  tally: ReportTally & { activePilots?: number };
  href?: string;
  highlightKey?: HighlightKey;
};

export function formatRankValue(
  value: number,
  metric: RankMetric,
  notation: Locale,
  language: Language,
  strings: RankingsStrings,
) {
  const number = formatNumber(value, notation, {
    maximumFractionDigits: metric === "rides" ? 0 : 1,
  });
  return formatMessage(strings.values[metric], { value: number }, language);
}

export function rankingEntries({
  tab,
  scope,
  chapters,
  countries,
  pilots,
  riders,
  scopeCountries,
  pathname,
  search,
}: {
  tab: RankingTab;
  scope: ScopeKind;
  chapters: RankingChapter[];
  countries: RankingCountry[];
  pilots: RankingPerson[] | null;
  riders: RankingPerson[] | null;
  scopeCountries: string[];
  pathname: string;
  search: string;
}): RankingEntry[] {
  if (tab === "chapters")
    return chapters.map((chapter) => ({
      key: chapter.id,
      name: chapter.name,
      detail: scope === "all" ? chapter.countryName : undefined,
      tally: chapter,
      href: rescopeHref(pathname, search, { chapter: chapter.slug }),
      highlightKey: chapterKey(chapter.id),
    }));
  if (tab === "countries")
    return countries.map((country) => ({
      key: country.code,
      name: country.name,
      tally: country,
      href: scopeCountries.includes(country.code)
        ? rescopeHref(pathname, search, { country: country.code })
        : undefined,
      highlightKey: countryKey(country.code),
    }));
  if (tab === "pilots")
    return (pilots ?? []).map((pilot) => ({
      key: pilot.id,
      name: pilot.name,
      tally: pilot,
      href: `/admin/members/${pilot.id}`,
    }));
  return (riders ?? []).map((rider) => ({
    key: rider.id,
    name: rider.name,
    tally: rider,
  }));
}

export const rankEntries = (entries: RankingEntry[], metric: RankMetric) =>
  rankRows(
    entries,
    (entry) => metricValue(entry.tally, metric).current,
    (entry) => metricValue(entry.tally, metric).previous,
  );
