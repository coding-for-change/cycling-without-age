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
