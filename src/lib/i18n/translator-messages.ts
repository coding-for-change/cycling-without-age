import { logger } from "@/lib/observability/logger";
import type { Locale } from "./locales";
import type { Dictionary } from "./messages";
import { keyMarker } from "./translator-marker";
import { TOLGEE_API_URL, TOLGEE_NAMESPACE } from "./translator-mode";

type Tree = { [key: string]: string | Tree };

const TIMEOUT_MS = 5000;

async function fetchLive(locale: Locale): Promise<Tree | null> {
  const projectId = process.env.TOLGEE_PROJECT_ID;
  const apiKey = process.env.TOLGEE_API_KEY;
  if (!projectId || !apiKey) return null;
  const url = `${TOLGEE_API_URL}/v2/projects/${projectId}/translations/${locale}?ns=${TOLGEE_NAMESPACE}`;
  try {
    const response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, "tolgee translations failed");
      return null;
    }
    const body = (await response.json()) as Record<string, Tree>;
    return body[locale] ?? null;
  } catch {
    logger.warn({ locale }, "tolgee translations unreachable");
    return null;
  }
}

function tag(bundled: Tree, live: Tree | undefined, path: string): Tree {
  return Object.fromEntries(
    Object.entries(bundled).map(([key, value]) => {
      const id = path ? `${path}.${key}` : key;
      const current = live?.[key];
      if (typeof value !== "string")
        return [
          key,
          tag(value, typeof current === "object" ? current : undefined, id),
        ];
      const text = typeof current === "string" && current ? current : value;
      return [key, text + keyMarker(id, TOLGEE_NAMESPACE)];
    }),
  );
}

export async function liveMessages(
  locale: Locale,
  bundled: Dictionary,
): Promise<Dictionary> {
  const live = await fetchLive(locale);
  return tag(bundled, live ?? undefined, "") as Dictionary;
}
