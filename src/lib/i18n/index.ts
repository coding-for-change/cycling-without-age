// Server-only by construction: `next/headers` fails at build time if this
// module is imported from a Client Component. Pass strings down as props.
import { cookies, headers } from "next/headers";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import en, { type Dictionary } from "./en";
import da from "./da";

export const locales = ["en", "da"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

// Set this cookie to persist the user's language preference.
export const LOCALE_COOKIE = "NEXT_LOCALE";

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, da };

export const hasLocale = (locale: string): locale is Locale =>
  (locales as readonly string[]).includes(locale);

export async function getLocale(): Promise<Locale> {
  // Saved user preference wins over the device/browser language.
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookieLocale && hasLocale(cookieLocale)) return cookieLocale;

  const languages = new Negotiator({
    headers: {
      "accept-language": (await headers()).get("accept-language") ?? "",
    },
  }).languages();

  try {
    return match(languages, locales, defaultLocale) as Locale;
  } catch {
    // match() throws on malformed Accept-Language values.
    return defaultLocale;
  }
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}
