import en from "@/messages/email/en.json";
import da from "@/messages/email/da.json";
import de from "@/messages/email/de.json";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n/locales";

export type EmailStrings = typeof en;

const dictionaries: Record<Locale, EmailStrings> = { en, da, de };

export const resolveEmailLocale = (
  locale: string | null | undefined,
): Locale => (locale && hasLocale(locale) ? locale : defaultLocale);

export function getEmailStrings(locale: Locale): EmailStrings {
  return dictionaries[locale];
}
