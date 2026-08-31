import type { HighestRole } from "@/lib/access";


export const HOME_BY_ROLE: Record<NonNullable<HighestRole>, string> = {
  superadmin: "/admin",
  countryAdmin: "/admin",
  chapterAdmin: "/admin",
  pilot: "/pilot",
  passenger: "/passenger",
};
