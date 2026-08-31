import en, { type EmailStrings } from "./en";
import da from "./da";
import de from "./de";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n/locales";

export type { EmailStrings };

const dictionaries: Record<Locale, EmailStrings> = { en, da, de };

export const resolveEmailLocale = (
  locale: string | null | undefined,
): Locale => (locale && hasLocale(locale) ? locale : defaultLocale);

export function getEmailStrings(
  locale: string | null | undefined,
): EmailStrings {
  return dictionaries[resolveEmailLocale(locale)];
}
