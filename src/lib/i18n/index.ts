import { cache } from "react";
import { cookies, headers } from "next/headers";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import {
  defaultLocale,
  hasLocale,
  LOCALE_COOKIE,
  locales,
  type Locale,
} from "./locales";
import { loadMessages, type Dictionary } from "./messages";

export { defaultLocale, hasLocale, LOCALE_COOKIE, locales };
export type { Locale };

export type { Dictionary };

export const getLocale = cache(async (): Promise<Locale> => {
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
});

export const getDictionary = cache(async (): Promise<Dictionary> =>
  loadMessages(await getLocale()),
);
