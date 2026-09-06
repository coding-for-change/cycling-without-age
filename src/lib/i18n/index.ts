// Server-only by construction: `next/headers` fails at build time if this
// module is imported from a Client Component. Pass strings down as props.
import { cookies, headers } from "next/headers";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import en, { type Dictionary } from "./en";
import da from "./da";
import de from "./de";
import { defaultLocale, hasLocale, locales, type Locale } from "./locales";

export { defaultLocale, hasLocale, locales };
export type { Locale };

export const LOCALE_COOKIE = "NEXT_LOCALE";

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, da, de };

export async function getLocale(): Promise<Locale> {
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
    return defaultLocale;
  }
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}
