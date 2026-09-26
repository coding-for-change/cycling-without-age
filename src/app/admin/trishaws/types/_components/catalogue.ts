import type { TrishawTypeRow } from "@/features/fleet";
import { ownerKey } from "@/features/fleet/schemas";
import type { ActiveScope, AdminScope, ScopeChapter } from "@/lib/access";
import { formatPlural, wordsLocale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { fill } from "@/lib/utils";
import { scopeCountries } from "../../../scope-countries";

export const SEAT_COUNTS = [1, 2, 3, 4, 5, 6] as const;

export const seatOptions = (dict: Dictionary, language: string) =>
  SEAT_COUNTS.map((count) => ({
    value: count,
    label: formatPlural(count, dict.fleet.common.seats, wordsLocale(language)),
  }));

export const catalogueCountryIds = (
  scope: AdminScope,
  active: ActiveScope,
  chapters: ScopeChapter[],
) => [
  ...new Set([
    ...chapters.map((chapter) => chapter.countryId),
    ...(active.kind === "country" ? [active.country.id] : []),
    ...(active.kind === "all" ? scope.countries.map((c) => c.id) : []),
  ]),
];

export const ownerNameOf = (type: TrishawTypeRow) =>
  type.scope === "country"
    ? (type.country?.name ?? null)
    : type.scope === "chapter"
      ? (type.chapter?.name ?? null)
      : null;

export function canSeeType(scope: AdminScope, type: TrishawTypeRow) {
  if (type.scope === "global") return true;
  if (type.scope === "chapter")
    return scope.chapters.some((chapter) => chapter.id === type.chapterId);
  return (
    scope.countries.some((country) => country.id === type.countryId) ||
    scope.chapters.some((chapter) => chapter.countryId === type.countryId)
  );
}

export function ownerOptions(
  scope: AdminScope,
  active: ActiveScope,
  chapters: ScopeChapter[],
  dict: Dictionary,
) {
  const labels = dict.fleet.types.create;
  return [
    ...chapters.map((chapter) => ({
      value: ownerKey({ scope: "chapter", chapterId: chapter.id }),
      label: fill(labels.ownerChapter, { name: chapter.name }),
    })),
    ...scopeCountries(scope, active).map((country) => ({
      value: ownerKey({ scope: "country", countryId: country.id }),
      label: fill(labels.ownerCountry, { name: country.name }),
    })),
    ...(scope.global
      ? [{ value: ownerKey({ scope: "global" }), label: labels.ownerGlobal }]
      : []),
  ];
}
