import type { HighestRole, Perspective } from "@/lib/access";
import { isAppPath } from "@/lib/app-path";

export const HOME_BY_ROLE: Record<NonNullable<HighestRole>, string> = {
  superadmin: "/admin",
  countryAdmin: "/admin",
  chapterAdmin: "/admin",
  pilot: "/pilot",
  passenger: "/passenger",
};

export const PERSPECTIVE_HOME: Record<Perspective, string> = {
  admin: "/admin",
  pilot: "/pilot",
  passenger: "/passenger",
};

export type MemberPerspective = Exclude<Perspective, "admin">;

export const signInHref = (next: string) =>
  `/sign-in?next=${encodeURIComponent(next)}`;

export const NEXT_COOKIE = "cwa.next";
export const NEXT_MAX_AGE = 60 * 60;

const LOOPS = ["/sign-in", "/onboarding", "/location", "/welcome", "/api"];

const printable = (raw: string) =>
  [...raw].every((char) => char > " " && char <= "~");

const decodedPath = (raw: string) => {
  try {
    return decodeURIComponent(raw.split(/[?#]/)[0]);
  } catch {
    return null;
  }
};

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!isAppPath(raw) || !printable(raw)) return null;

  const path = decodedPath(raw);
  if (path === null) return null;
  return LOOPS.some((loop) => path === loop || path.startsWith(`${loop}/`))
    ? null
    : raw;
}
