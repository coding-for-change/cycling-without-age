import { CONTENT_LANGUAGES, training } from "@/features/training";
import type { FamilyOwnerRow } from "@/features/training";
import type { AdminScope } from "@/lib/access";
import type { Dictionary } from "@/lib/i18n";

const names = new Map<string, Intl.DisplayNames>();

export const languageLabel = (language: string, locale: string) => {
  let display = names.get(locale);
  if (!display) {
    display = new Intl.DisplayNames([locale], { type: "language" });
    names.set(locale, display);
  }
  const name = display.of(language) ?? language;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
};

export const contentLanguages = (locale: string) =>
  CONTENT_LANGUAGES.map((value) => ({
    value,
    label: languageLabel(value, locale),
  }));

export function clockOf(seconds: number | null) {
  if (seconds === null) return null;
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

export const visibleSearchOf = (scope: AdminScope) => ({
  countryIds: [
    ...new Set([
      ...scope.countries.map((country) => country.id),
      ...scope.chapters.map((chapter) => chapter.countryId),
    ]),
  ],
  chapterIds: scope.chapters.map((chapter) => chapter.id),
});

export const ownerOf = (family: FamilyOwnerRow, dict: Dictionary) =>
  training.ownerNameOfFamily(family) ??
  dict.admin.training.list.scopes[family.scope];
