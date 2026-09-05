export const locales = ["en", "da", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const hasLocale = (locale: string): locale is Locale =>
  (locales as readonly string[]).includes(locale);

/**
 * Endonyms — a language is always offered in its own words, so someone who
 * landed on the wrong one can still recognise theirs.
 */
export const LOCALE_LABELS: Record<Locale, { name: string }> = {
  en: { name: "English" },
  da: { name: "Dansk" },
  de: { name: "Deutsch" },
};
