/**
 * Every ride time is stored as an instant and rendered in its chapter's own
 * zone — a pilot reading the roster in another country still sees the time the
 * ride actually starts. The zone therefore belongs to the chapter, not to the
 * viewer and not to the server.
 */

export const FALLBACK_TIME_ZONE = "UTC";

/**
 * CWA's rollout markets that have exactly one civil time zone, so a new
 * chapter's zone can be resolved from its country without asking. The
 * multi-zone markets in scope — US, CA, AU, ES, PT, NZ — are deliberately
 * absent: there is no right answer to guess, so they fall back and the admin
 * corrects the chapter. See `.agents/skills/cwa-context/references/10-languages-and-markets.md`.
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
