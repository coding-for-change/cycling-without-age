import { z } from "zod";

export const chapterRole = z.enum(["admin", "pilot", "passenger"]);
export type ChapterRole = z.infer<typeof chapterRole>;

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
    .filter((r): r is ChapterRole => chapterRole.safeParse(r).success);

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

export type ScopeCountry = { id: string; code: string; name: string };

export type ScopeChapter = {
  id: string;
  slug: string;
  name: string;
  countryId: string;
};

export type AdminScope = {
  global: boolean;
  countries: ScopeCountry[];
  chapters: ScopeChapter[];
  canSeeChapters: boolean;
  canSeeCountries: boolean;
  canCreateCountries: boolean;
  canDeleteAccounts: boolean;
  canSeeGlobalEvents: boolean;
};

export type ActiveScope =
  | { kind: "all" }
  | { kind: "country"; country: ScopeCountry }
  | { kind: "chapter"; chapter: ScopeChapter };

export const hasAnyAdminScope = (access: Access) =>
  isSuperAdmin(access) ||
  access.countryAdminOf.length > 0 ||
  access.memberships.some((m) => m.roles.includes("admin"));

export const canDeleteOwnAccount = (access: Access) =>
  !hasAnyAdminScope(access);

export const adminChapterIds = (access: Access) =>
  access.memberships
    .filter((m) => m.roles.includes("admin"))
    .map((m) => m.chapterId);

export function resolveAdminScope(
  access: Access,
  allCountries: readonly ScopeCountry[],
  allChapters: readonly ScopeChapter[],
): AdminScope {
  const global = isSuperAdmin(access);
  const countryIds = new Set(
    global ? allCountries.map((c) => c.id) : access.countryAdminOf,
  );
  const direct = new Set(adminChapterIds(access));

  return {
    global,
    countries: allCountries.filter((c) => countryIds.has(c.id)),
    chapters: global
      ? [...allChapters]
      : allChapters.filter(
          (c) => countryIds.has(c.countryId) || direct.has(c.id),
        ),
    canSeeChapters: global || countryIds.size > 0,
    canSeeCountries: global,
    canCreateCountries: global,
    canDeleteAccounts: global,
    canSeeGlobalEvents: global,
  };
}

export function defaultActiveScope(scope: AdminScope): ActiveScope {
  if (scope.global) return { kind: "all" };

  const [onlyCountry] = scope.countries;
  if (
    scope.countries.length === 1 &&
    scope.chapters.every((c) => c.countryId === onlyCountry.id)
  )
    return { kind: "country", country: onlyCountry };

  if (scope.chapters.length === 1)
    return { kind: "chapter", chapter: scope.chapters[0] };

  return { kind: "all" };
}

export function resolveActiveScope(
  scope: AdminScope,
  params: { chapter?: string; country?: string },
): ActiveScope | null {
  if (params.chapter) {
    const slug = params.chapter.toLowerCase();
    const chapter = scope.chapters.find((c) => c.slug.toLowerCase() === slug);
    return chapter ? { kind: "chapter", chapter } : null;
  }

  if (params.country) {
    const code = params.country.toUpperCase();
    const country = scope.countries.find((c) => c.code === code);
    return country ? { kind: "country", country } : null;
  }

  return defaultActiveScope(scope);
}

export function scopeChapters(
  scope: AdminScope,
  active: ActiveScope,
): ScopeChapter[] {
  if (active.kind === "chapter") return [active.chapter];
  if (active.kind === "country")
    return scope.chapters.filter((c) => c.countryId === active.country.id);
  return scope.chapters;
}

export type Perspective = "admin" | "pilot" | "passenger";

export function availablePerspectives(access: Access): Perspective[] {
  const roles = new Set(access.memberships.flatMap((m) => m.roles));
  return [
    ...(hasAnyAdminScope(access) ? (["admin"] as const) : []),
    ...(roles.has("pilot") ? (["pilot"] as const) : []),
    ...(roles.has("passenger") ? (["passenger"] as const) : []),
  ];
}
