import type { ScopeArg } from "@/lib/commands";

/**
 * Narrowing keeps you on the page you are already looking at, so the switcher
 * and the command bar both rewrite the query rather than navigating. The
 * pathname only exists in the browser — a Layout cannot read `searchParams` —
 * which is why this is a client helper and not part of the server registry.
 */
export const scopeHref = (pathname: string, arg: ScopeArg) => {
  if (arg === "all") return pathname;
  const [kind, value] = arg.split(":");
  return `${pathname}?${kind}=${encodeURIComponent(value)}`;
};

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
