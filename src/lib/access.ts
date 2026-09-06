export type ChapterRole = "admin" | "pilot" | "passenger";

export type Membership = { chapterId: string; roles: ChapterRole[] };

export type Access = {
  role: string | null;
  countryAdminOf: string[];
  memberships: Membership[];
};

export type HighestRole =
  "superadmin" | "countryAdmin" | "chapterAdmin" | "pilot" | "passenger" | null;

export const parseRoles = (role: string | null | undefined): ChapterRole[] =>
  (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(
      (r): r is ChapterRole =>
        r === "admin" || r === "pilot" || r === "passenger",
    );

export const isSuperAdmin = (access: Access) =>
  (access.role ?? "").split(",").some((r) => r.trim() === "superadmin");

export const isCountryAdmin = (access: Access, countryId: string) =>
  isSuperAdmin(access) || access.countryAdminOf.includes(countryId);

export const hasChapterRole = (
  access: Access,
  chapterId: string,
  role: ChapterRole,
) =>
  isSuperAdmin(access) ||
  access.memberships.some(
    (m) => m.chapterId === chapterId && m.roles.includes(role),
  );

export const isChapterAdmin = (
  access: Access,
  chapterId: string,
  chapterCountryId: string | null,
) =>
  hasChapterRole(access, chapterId, "admin") ||
  (chapterCountryId !== null && isCountryAdmin(access, chapterCountryId));

export function getHighestRole(access: Access): HighestRole {
  if (isSuperAdmin(access)) return "superadmin";
  if (access.countryAdminOf.length > 0) return "countryAdmin";
  const roles = access.memberships.flatMap((m) => m.roles);
  if (roles.includes("admin")) return "chapterAdmin";
  if (roles.includes("pilot")) return "pilot";
  if (roles.includes("passenger")) return "passenger";
  return null;
}
