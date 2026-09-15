/**
 * Every ride time is stored as an instant and rendered in its chapter's own
 * zone — a pilot reading the roster in another country still sees the time the
 * ride actually starts. The zone therefore belongs to the chapter, not to the
 * viewer and not to the server.
 */

import tzLookup from "@photostructure/tz-lookup";

export const FALLBACK_TIME_ZONE = "UTC";

/**
 * CWA's rollout markets that have exactly one civil time zone. Only a fallback
 * now that coordinates answer the question properly — a chapter always has a
 * pin, but this keeps a country-only caller honest.
 * See `.agents/skills/cwa-context/references/10-languages-and-markets.md`.
 */
const SINGLE_ZONE_MARKETS: Record<string, string> = {
  AT: "Europe/Vienna",
  BE: "Europe/Brussels",
  CH: "Europe/Zurich",
  DE: "Europe/Berlin",
  DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki",
  FR: "Europe/Paris",
  GB: "Europe/London",
  HU: "Europe/Budapest",
  IE: "Europe/Dublin",
  NL: "Europe/Amsterdam",
  NO: "Europe/Oslo",
  PL: "Europe/Warsaw",
  SE: "Europe/Stockholm",
  SK: "Europe/Bratislava",
};

/** Whether the runtime's ICU data knows this IANA zone. */
export function isValidTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * The zone a chapter in this country almost certainly keeps, or `null` where
 * the country spans several and guessing would be wrong.
 */
export function defaultTimeZoneForCountry(code: string): string | null {
  return SINGLE_ZONE_MARKETS[code.toUpperCase()] ?? null;
}

/** Same, but always a usable zone — for the column, which is NOT NULL. */
export function resolveTimeZone(code: string): string {
  return defaultTimeZoneForCountry(code) ?? FALLBACK_TIME_ZONE;
}

let cachedZones: string[] | null = null;

/** Every IANA zone this runtime knows, for the chapter's zone picker. */
export function supportedTimeZones(): string[] {
  if (cachedZones) return cachedZones;
  const supported = Intl.supportedValuesOf?.("timeZone") ?? [];
  cachedZones = supported.length ? [...supported] : [FALLBACK_TIME_ZONE];
  return cachedZones;
}

/**
 * The zone in force at a point on the map.
 *
 * A country is the wrong unit for this: the US, Canada and Australia span
 * several zones, and Spain and Portugal each keep a second one offshore
 * (Atlantic/Canary, Atlantic/Azores). A chapter always has a pin — the address
 * search fills it in — so the pin is what decides.
 *
 * The lookup is a compressed raster, so a point within a kilometre or two of a
 * zone border can land on the wrong side. That is why the chapter keeps an
 * editable column rather than deriving the zone on every read.
 */
export function timeZoneForCoordinates(
  latitude: number,
  longitude: number,
): string | null {
  try {
    const zone = tzLookup(latitude, longitude);
    return isValidTimeZone(zone) ? zone : null;
  } catch {
    // Out-of-range coordinates, or a zone this runtime's ICU data predates.
    return null;
  }
}

/**
 * The zone to store for a new chapter: its pin first, its country second, UTC
 * last. Never throws — a chapter must be creatable even from a bad pin.
 */
export function resolveChapterTimeZone(input: {
  latitude?: number | null;
  longitude?: number | null;
  countryCode?: string | null;
}): string {
  const { latitude, longitude, countryCode } = input;
  if (typeof latitude === "number" && typeof longitude === "number") {
    const fromPin = timeZoneForCoordinates(latitude, longitude);
    if (fromPin) return fromPin;
  }
  return countryCode ? resolveTimeZone(countryCode) : FALLBACK_TIME_ZONE;
}
