import en, { type EmailStrings } from "./en";
import da from "./da";
import de from "./de";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n/locales";

export type { EmailStrings };

const dictionaries: Record<Locale, EmailStrings> = { en, da, de };

export const resolveEmailLocale = (
  locale: string | null | undefined,
): Locale => (locale && hasLocale(locale) ? locale : defaultLocale);

export function getEmailStrings(locale: Locale): EmailStrings {
  return dictionaries[locale];
}

export type PluralForms = { one: string; other: string };

const pluralRules = new Map<Locale, Intl.PluralRules>();

export function pluralForm(
  locale: Locale,
  count: number,
  forms: PluralForms,
): string {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRules.set(locale, rules);
  }
  return rules.select(count) === "one" ? forms.one : forms.other;
}
