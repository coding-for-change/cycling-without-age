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
};

export type ActiveScope =
  | { kind: "all" }
  | { kind: "country"; country: ScopeCountry }
  | { kind: "chapter"; chapter: ScopeChapter };

export const hasAnyAdminScope = (access: Access) =>
  isSuperAdmin(access) ||
  access.countryAdminOf.length > 0 ||
  access.memberships.some((m) => m.roles.includes("admin"));

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
    // A superadmin gets every chapter unconditionally. Filtering them through
    // `countryIds` would drop a chapter whose country is missing from the list,
    // which `isChapterAdmin(superadmin, x, null) === true` says cannot happen.
    chapters: global
      ? [...allChapters]
      : allChapters.filter(
          (c) => countryIds.has(c.countryId) || direct.has(c.id),
        ),
    canSeeChapters: global || countryIds.size > 0,
    canSeeCountries: global,
  };
}

/**
 * The widest view someone is entitled to, used when no narrowing param is set.
 * A country is only the default when it covers every chapter in reach — a
 * country admin of DK who also runs one German chapter would otherwise open
 * onto a view that silently omits it.
 */
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

/**
 * `null` means the requested narrowing is outside this person's authority.
 *
 * ponytail: no page consumes this yet — every `/admin/*` page is a static empty
 * state, so there is nothing to leak. The first page that reads data for the
 * narrowed scope MUST turn a `null` here into `forbidden()`, or `?chapter=` and
 * `?country=` become an escalation path around the scope the sidebar offers.
 */
export function resolveActiveScope(
  scope: AdminScope,
  params: { chapter?: string; country?: string },
): ActiveScope | null {
  if (params.chapter) {
    // Case-folded on both sides: a URL typed with the wrong capitalisation is a
    // typo, and reading it as "outside your authority" would surface as an
    // access bug rather than a bad link.
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

export type Perspective = "admin" | "pilot" | "passenger";

/**
 * Which hats someone can put on. Read off the membership rows rather than
 * `getHighestRole`, which collapses a stack down to its top entry — a
 * superadmin who also pedals in München is both, and the switcher has to offer
 * both. A superadmin is not implicitly a pilot: that takes a real membership.
 */
export function availablePerspectives(access: Access): Perspective[] {
  const roles = new Set(access.memberships.flatMap((m) => m.roles));
  return [
    ...(hasAnyAdminScope(access) ? (["admin"] as const) : []),
    ...(roles.has("pilot") ? (["pilot"] as const) : []),
    ...(roles.has("passenger") ? (["passenger"] as const) : []),
  ];
}
