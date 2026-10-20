import {
  CONTENT_LANGUAGES,
  ownerKey,
  type ContentLanguage,
  type TrainingVideoRow,
} from "@/features/training";
import type { ActiveScope, AdminScope, ScopeChapter } from "@/lib/access";
import { formatNumber, type Locale as NotationLocale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { scopeCountries } from "../../scope-countries";

const languageNames = new Map<string, Intl.DisplayNames>();

const displayNames = (locale: string) => {
  let names = languageNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "language" });
    languageNames.set(locale, names);
  }
  return names;
};

export const languageName = (language: string, locale: string) => {
  const name = displayNames(locale).of(language) ?? language;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
};

export const languageOptions = (locale: string) =>
  CONTENT_LANGUAGES.map((value) => ({
    value,
    label: languageName(value, locale),
  }));

export const defaultLanguage = (locale: string): ContentLanguage =>
  (CONTENT_LANGUAGES as readonly string[]).includes(locale)
    ? (locale as ContentLanguage)
    : "en";

export function ownerOptions(
  scope: AdminScope,
  active: ActiveScope,
  chapters: ScopeChapter[],
  dict: Dictionary,
  locale: string,
) {
  const labels = dict.admin.training.library.owners;
  return [
    ...chapters.map((chapter) => ({
      key: ownerKey({ scope: "chapter", chapterId: chapter.id }),
      label: formatMessage(labels.chapter, { name: chapter.name }, locale),
    })),
    ...scopeCountries(scope, active).map((country) => ({
      key: ownerKey({ scope: "country", countryId: country.id }),
      label: formatMessage(labels.country, { name: country.name }, locale),
    })),
    ...(scope.global
      ? [{ key: ownerKey({ scope: "global" }), label: labels.global }]
      : []),
  ];
}

export function defaultOwnerKey(
  active: ActiveScope,
  options: { key: string }[],
) {
  const has = (key: string) => options.some((option) => option.key === key);
  const preferred =
    active.kind === "chapter"
      ? ownerKey({ scope: "chapter", chapterId: active.chapter.id })
      : active.kind === "country"
        ? ownerKey({ scope: "country", countryId: active.country.id })
        : ownerKey({ scope: "global" });
  return has(preferred) ? preferred : (options[0]?.key ?? preferred);
}

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

export function canSeeVideo(scope: AdminScope, video: TrainingVideoRow) {
  if (video.scope === "global") return true;
  if (video.scope === "chapter")
    return scope.chapters.some((chapter) => chapter.id === video.chapterId);
  return (
    scope.countries.some((country) => country.id === video.countryId) ||
    scope.chapters.some((chapter) => chapter.countryId === video.countryId)
  );
}

export const ownerNameOf = (video: TrainingVideoRow) =>
  video.scope === "country"
    ? (video.country?.name ?? null)
    : video.scope === "chapter"
      ? (video.chapter?.name ?? null)
      : null;

export function formatClock(seconds: number | null) {
  if (seconds === null) return null;
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

export function formatBytes(bytes: number, notation: NotationLocale) {
  const gigabytes = bytes / 1e9;
  return gigabytes >= 1
    ? formatNumber(gigabytes, notation, {
        style: "unit",
        unit: "gigabyte",
        maximumFractionDigits: 1,
      })
    : formatNumber(bytes / 1e6, notation, {
        style: "unit",
        unit: "megabyte",
        maximumFractionDigits: bytes < 1e7 ? 1 : 0,
      });
}
