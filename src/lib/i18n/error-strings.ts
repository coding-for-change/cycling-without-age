import en from "@/messages/errors/en.json";
import da from "@/messages/errors/da.json";
import de from "@/messages/errors/de.json";
import { defaultLocale, hasLocale, type Locale } from "./locales";

export type ErrorStrings = typeof en;
export type ReportProblemStrings = ErrorStrings["drawer"];

const ERROR_STRINGS: Record<Locale, ErrorStrings> = { en, de, da };

const normalise = (value: string | null | undefined): Locale | null => {
  const candidate = (value ?? "").slice(0, 2).toLowerCase();
  return hasLocale(candidate) ? candidate : null;
};

// The root boundary replaces <html>, so its lang attribute is back to the
// default — the cookie is the only locale that survives a global error.
export function currentErrorLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const cookie = /(?:^|;\s*)NEXT_LOCALE=([^;]*)/.exec(document.cookie)?.[1];
  return (
    normalise(cookie ? decodeURIComponent(cookie) : null) ??
    normalise(document.documentElement.lang) ??
    normalise(navigator.language) ??
    defaultLocale
  );
}

export const errorStrings = (
  locale: Locale = currentErrorLocale(),
): ErrorStrings => ERROR_STRINGS[locale];
