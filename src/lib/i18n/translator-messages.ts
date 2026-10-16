import { IntlMessageFormat } from "intl-messageformat";
import { logger } from "@/lib/observability/logger";
import type { Locale } from "./locales";
import { messageArguments } from "./message-arguments";
import type { Dictionary } from "./messages";
import { keyMarker } from "./translator-marker";
import { TOLGEE_API_URL, TOLGEE_NAMESPACE } from "./translator-mode";

type Tree = { [key: string]: string | Tree };

const TIMEOUT_MS = 5000;
export const LIVE_TTL_MS = 60_000;
export const BREAKER_MS = 5 * 60_000;

const UNAVAILABLE = Symbol("unavailable");

const tripsBreaker = (status: number) =>
  status === 429 || status === 444 || status >= 500;

async function fetchLive(
  locale: Locale,
): Promise<Tree | null | typeof UNAVAILABLE> {
  const projectId = process.env.TOLGEE_PROJECT_ID;
  const apiKey = process.env.TOLGEE_READ_KEY;
  if (!projectId || !apiKey) return null;
  const url = `${TOLGEE_API_URL}/v2/projects/${projectId}/translations/${locale}?ns=${TOLGEE_NAMESPACE}`;
  try {
    const response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (tripsBreaker(response.status)) return UNAVAILABLE;
      logger.warn({ status: response.status }, "tolgee translations failed");
      return null;
    }
    const body = (await response.json()) as Record<string, Tree>;
    return body[locale] ?? null;
  } catch {
    return UNAVAILABLE;
  }
}

const argumentsOf = (message: string, locale: Locale) =>
  messageArguments(new IntlMessageFormat(message, locale).getAst()).join();

function usable(live: string, bundled: string, locale: Locale): boolean {
  try {
    return argumentsOf(live, locale) === argumentsOf(bundled, locale);
  } catch {
    return false;
  }
}

function pick(
  live: string | Tree | undefined,
  bundled: string,
  id: string,
  locale: Locale,
): string {
  if (typeof live !== "string" || !live || live === bundled) return bundled;
  if (usable(live, bundled, locale)) return live;
  logger.warn({ key: id, locale }, "tolgee translation rejected");
  return bundled;
}

function tag(
  bundled: Tree,
  live: Tree | undefined,
  path: string,
  locale: Locale,
): Tree {
  return Object.fromEntries(
    Object.entries(bundled).map(([key, value]) => {
      const id = path ? `${path}.${key}` : key;
      const current = live?.[key];
      if (typeof value !== "string")
        return [
          key,
          tag(
            value,
            typeof current === "object" ? current : undefined,
            id,
            locale,
          ),
        ];
      return [
        key,
        pick(current, value, id, locale) + keyMarker(id, TOLGEE_NAMESPACE),
      ];
    }),
  );
}

type Entry = { value: Dictionary; expires: number };

const fresh = new Map<Locale, Entry>();
const pending = new Map<Locale, Promise<Dictionary>>();
const bundledTagged = new Map<Locale, Dictionary>();
let breakerUntil = 0;

export function taggedBundled(locale: Locale, bundled: Dictionary): Dictionary {
  let value = bundledTagged.get(locale);
  if (!value) {
    value = tag(bundled, undefined, "", locale) as Dictionary;
    bundledTagged.set(locale, value);
  }
  return value;
}

function tripBreaker() {
  if (Date.now() < breakerUntil) return;
  breakerUntil = Date.now() + BREAKER_MS;
  logger.warn({ event: "i18n.tolgee_breaker_open" }, "tolgee breaker open");
}

async function load(locale: Locale, bundled: Dictionary): Promise<Dictionary> {
  const live = await fetchLive(locale);
  if (live === UNAVAILABLE) {
    tripBreaker();
    return fresh.get(locale)?.value ?? taggedBundled(locale, bundled);
  }
  const value = live
    ? (tag(bundled, live, "", locale) as Dictionary)
    : taggedBundled(locale, bundled);
  fresh.set(locale, { value, expires: Date.now() + LIVE_TTL_MS });
  return value;
}

function refresh(locale: Locale, bundled: Dictionary): Promise<Dictionary> {
  const running = pending.get(locale);
  if (running) return running;
  const promise = load(locale, bundled)
    .catch(() => fresh.get(locale)?.value ?? taggedBundled(locale, bundled))
    .finally(() => pending.delete(locale));
  pending.set(locale, promise);
  return promise;
}

export async function liveMessages(
  locale: Locale,
  bundled: Dictionary,
): Promise<Dictionary> {
  const entry = fresh.get(locale);
  if (entry && entry.expires > Date.now()) return entry.value;
  if (Date.now() < breakerUntil)
    return entry?.value ?? taggedBundled(locale, bundled);
  const next = refresh(locale, bundled);
  return entry?.value ?? next;
}
