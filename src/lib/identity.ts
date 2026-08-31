import { z } from "zod";
import {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import type { Locale } from "@/lib/format";

export type Channel = "email" | "phone";

export type Identity =
  { channel: "email"; value: string } | { channel: "phone"; value: string };

export type IdentityProblem = "empty" | "invalidEmail" | "invalidPhone";

export type IdentityResult =
  { ok: true; identity: Identity } | { ok: false; problem: IdentityProblem };

const email = z.email();


export function looksLikePhone(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.includes("@")) return false;
  return /^[+\d]/.test(trimmed);
}


export function parseIdentity(
  input: string,
  country: CountryCode,
): IdentityResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, problem: "empty" };

  if (!looksLikePhone(trimmed)) {
    const parsed = email.safeParse(trimmed.toLowerCase());
    return parsed.success
      ? { ok: true, identity: { channel: "email", value: parsed.data } }
      : { ok: false, problem: "invalidEmail" };
  }

  const phone = parsePhoneNumberFromString(trimmed, country);
  return phone?.isValid()
    ? { ok: true, identity: { channel: "phone", value: phone.number } }
    : { ok: false, problem: "invalidPhone" };
}

export const COUNTRIES = getCountries();

export const dialCodeOf = (country: CountryCode) =>
  `+${getCountryCallingCode(country)}`;


export function defaultCountryFor(locale: Locale): CountryCode {
  const region = locale.split("-")[1];
  return region && isSupportedCountry(region) ? region : "GB";
}

export type { CountryCode };
