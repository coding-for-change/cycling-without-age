import type { ScopeArg } from "@/lib/commands";

/**
 * A param naming a scope the viewer has no authority over resolves to their
 * default instead of being shown as selected — otherwise a hand-typed
 * `?chapter=` would leave the switcher and the breadcrumb claiming a chapter the
 * URL does not actually grant. This is presentation only: the authority check
 * that matters is `resolveActiveScope` in `lib/access.ts`, on the server.
 */
export const readScopeArg = (
  params: URLSearchParams,
  allowed: readonly ScopeArg[],
  fallback: ScopeArg,
): ScopeArg => {
  const chapter = params.get("chapter");
  const country = params.get("country");
  const requested: ScopeArg | null = chapter
    ? `chapter:${chapter}`
    : country
      ? `country:${country}`
      : null;

  if (!requested) return fallback;
  return allowed.includes(requested) ? requested : fallback;
};
