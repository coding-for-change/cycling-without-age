import type { HighestRole, Perspective } from "@/lib/access";

export const HOME_BY_ROLE: Record<NonNullable<HighestRole>, string> = {
  superadmin: "/admin",
  countryAdmin: "/admin",
  chapterAdmin: "/admin",
  pilot: "/pilot",
  passenger: "/passenger",
};

/**
 * Where each perspective lives. `HOME_BY_ROLE` answers "where does this account
 * belong after sign-in"; this answers "where does this hat live", which is the
 * question the admin shell's perspective switcher asks.
 */
export const PERSPECTIVE_HOME: Record<Perspective, string> = {
  admin: "/admin",
  pilot: "/pilot",
  passenger: "/passenger",
};

export const NEXT_COOKIE = "cwa.next";
export const NEXT_MAX_AGE = 60 * 60;

/**
 * Paths that must never be a `?next=` target. Sending someone "back" into the
 * auth flow after that flow finished is a loop, and `/api` is not a screen at
 * all. `/join/*` and `/account` are ordinary destinations and stay valid.
 */
const LOOPS = ["/sign-in", "/onboarding", "/location", "/welcome", "/api"];

const printable = (raw: string) =>
  [...raw].every((char) => char > " " && char <= "~");

/**
 * Next matches a route on the decoded pathname, so the loop check has to look at
 * the same string it will: `/%73ign-in` is `/sign-in` by the time it is routed,
 * and would otherwise slip past `LOOPS` and bounce the dispatcher forever.
 * Malformed escapes are refused outright — nothing serves them anyway.
 */
const decodedPath = (raw: string) => {
  try {
    return decodeURIComponent(raw.split(/[?#]/)[0]);
  } catch {
    return null;
  }
};

/**
 * The only value allowed to reach `redirect()` from a URL or a cookie: a
 * same-origin absolute path, short, printable, and not part of the flow that
 * would send it back to itself. Anything else is `null`, and the caller falls
 * back to a destination it decided itself.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 512) return null;
  if (!/^\/[^/\\]/.test(raw)) return null;
  if (!printable(raw)) return null;
  if (new URL(raw, "http://x").origin !== "http://x") return null;

  const path = decodedPath(raw);
  if (path === null) return null;
  return LOOPS.some((loop) => path === loop || path.startsWith(`${loop}/`))
    ? null
    : raw;
}
