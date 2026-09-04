import {
  adminChapterIds,
  availablePerspectives,
  defaultActiveScope,
  getHighestRole,
  hasAnyAdminScope,
  hasChapterRole,
  isChapterAdmin,
  isCountryAdmin,
  isSuperAdmin,
  parseRoles,
  resolveActiveScope,
  resolveAdminScope,
} from "@/lib/access";
import type {
  Access,
  AdminScope,
  ScopeChapter,
  ScopeCountry,
} from "@/lib/access";

const DE = "country-de";
const DK = "country-dk";
const BERLIN = "chapter-berlin";
const AARHUS = "chapter-aarhus";
const countryOf: Record<string, string> = { [BERLIN]: DE, [AARHUS]: DK };

const none: Access = { role: null, countryAdminOf: [], memberships: [] };
const adminOf = (a: Access, chapter: string) =>
  isChapterAdmin(a, chapter, countryOf[chapter]);

const superadmin: Access = { ...none, role: "superadmin" };
const deAdmin: Access = { ...none, countryAdminOf: [DE] };
const berlinAdmin: Access = {
  ...none,
  memberships: [{ chapterId: BERLIN, roles: ["admin"] }],
};
const berlinPilot: Access = {
  ...none,
  memberships: [{ chapterId: BERLIN, roles: ["pilot"] }],
};
const aarhusPassenger: Access = {
  ...none,
  memberships: [{ chapterId: AARHUS, roles: ["passenger"] }],
};

describe("parseRoles", () => {
  it("splits, trims and preserves the comma round-trip", () => {
    expect(parseRoles("admin, pilot")).toEqual(["admin", "pilot"]);
  });

  it("returns [] for null, undefined and empty input", () => {
    expect(parseRoles(null)).toEqual([]);
    expect(parseRoles(undefined)).toEqual([]);
    expect(parseRoles("")).toEqual([]);
    expect(parseRoles(" ,  ,")).toEqual([]);
  });

  it("drops unknown roles instead of trusting the DB string", () => {
    expect(parseRoles(" ,owner,")).toEqual([]);
    expect(parseRoles("admin,owner,pilot")).toEqual(["admin", "pilot"]);
  });

  it("does not promote a global role into a chapter role", () => {
    expect(parseRoles("superadmin")).toEqual([]);
    expect(parseRoles("user")).toEqual([]);
  });

  it("is case-sensitive — no accidental grant from casing", () => {
    expect(parseRoles("Admin")).toEqual([]);
    expect(parseRoles("PILOT")).toEqual([]);
  });
});

describe("isSuperAdmin", () => {
  it("matches a whole role entry, in any position", () => {
    expect(isSuperAdmin(superadmin)).toBe(true);
    expect(isSuperAdmin({ ...none, role: "user, superadmin" })).toBe(true);
  });

  it("is false for no role and for ordinary roles", () => {
    expect(isSuperAdmin(none)).toBe(false);
    expect(isSuperAdmin({ ...none, role: "user" })).toBe(false);
  });

  it("does not match on substrings", () => {
    expect(isSuperAdmin({ ...none, role: "notsuperadmin" })).toBe(false);
    expect(isSuperAdmin({ ...none, role: "superadministrator" })).toBe(false);
    expect(isSuperAdmin({ ...none, role: "super" })).toBe(false);
  });

  it("is not implied by chapter admin or country admin", () => {
    expect(isSuperAdmin(berlinAdmin)).toBe(false);
    expect(isSuperAdmin(deAdmin)).toBe(false);
  });
});

describe("role inheritance", () => {
  it("lets a superadmin pass every check", () => {
    expect(isCountryAdmin(superadmin, DK)).toBe(true);
    expect(adminOf(superadmin, AARHUS)).toBe(true);
    expect(hasChapterRole(superadmin, AARHUS, "pilot")).toBe(true);
  });

  it("gives a country admin chapter-admin rights in their own country only", () => {
    expect(adminOf(deAdmin, BERLIN)).toBe(true);
    expect(adminOf(deAdmin, AARHUS)).toBe(false);
    expect(isCountryAdmin(deAdmin, DK)).toBe(false);
  });

  it("does not let a country admin claim a chapter of unknown country", () => {
    expect(isChapterAdmin(deAdmin, BERLIN, null)).toBe(false);
    expect(isChapterAdmin(superadmin, BERLIN, null)).toBe(true);
  });

  it("does not let a chapter admin inherit upward", () => {
    expect(adminOf(berlinAdmin, BERLIN)).toBe(true);
    expect(adminOf(berlinAdmin, AARHUS)).toBe(false);
    expect(isCountryAdmin(berlinAdmin, DE)).toBe(false);
  });

  it("scopes a chapter role to its own chapter", () => {
    expect(hasChapterRole(berlinPilot, BERLIN, "pilot")).toBe(true);
    expect(hasChapterRole(berlinPilot, AARHUS, "pilot")).toBe(false);
    expect(hasChapterRole(berlinPilot, BERLIN, "admin")).toBe(false);
  });

  it("stacks roles on one membership row", () => {
    const both: Access = {
      ...none,
      memberships: [{ chapterId: BERLIN, roles: parseRoles("admin,pilot") }],
    };
    expect(hasChapterRole(both, BERLIN, "pilot")).toBe(true);
    expect(hasChapterRole(both, BERLIN, "admin")).toBe(true);
    expect(hasChapterRole(both, BERLIN, "passenger")).toBe(false);
  });

  it("gives a plain member no admin power", () => {
    expect(adminOf(aarhusPassenger, AARHUS)).toBe(false);
    expect(hasChapterRole(aarhusPassenger, AARHUS, "pilot")).toBe(false);
  });

  it("gives a signed-in user with no roles nothing", () => {
    expect(isCountryAdmin(none, DE)).toBe(false);
    expect(adminOf(none, BERLIN)).toBe(false);
    expect(hasChapterRole(none, BERLIN, "passenger")).toBe(false);
  });
});

describe("getHighestRole", () => {
  it.each([
    ["superadmin", superadmin, "superadmin"],
    ["country admin", deAdmin, "countryAdmin"],
    ["chapter admin", berlinAdmin, "chapterAdmin"],
    ["pilot", berlinPilot, "pilot"],
    ["passenger", aarhusPassenger, "passenger"],
    ["fresh sign-up", none, null],
  ])("reports %s", (_label, access, expected) => {
    expect(getHighestRole(access as Access)).toBe(expected);
  });

  it("reports the highest role across chapters, not the first", () => {
    const mixed: Access = {
      ...none,
      memberships: [
        { chapterId: AARHUS, roles: ["passenger"] },
        { chapterId: BERLIN, roles: ["pilot", "admin"] },
      ],
    };
    expect(getHighestRole(mixed)).toBe("chapterAdmin");
  });

  it("prefers country admin over a chapter membership", () => {
    expect(
      getHighestRole({ ...deAdmin, memberships: berlinAdmin.memberships }),
    ).toBe("countryAdmin");
  });
});

// The seed org (docs-internal/DEV-ACCOUNTS.md): two countries, three chapters.
const COUNTRIES: ScopeCountry[] = [
  { id: DE, code: "DE", name: "Deutschland" },
  { id: DK, code: "DK", name: "Danmark" },
];

const MUENCHEN: ScopeChapter = {
  id: "chapter-muenchen",
  slug: "muenchen",
  name: "München – Seniorenheim Sonnenhof",
  countryId: DE,
};
const HAMBURG: ScopeChapter = {
  id: "chapter-hamburg",
  slug: "hamburg",
  name: "Hamburg – Alstergarten",
  countryId: DE,
};
const COPENHAGEN: ScopeChapter = {
  id: "chapter-copenhagen",
  slug: "copenhagen",
  name: "København – Nørrebro",
  countryId: DK,
};
const CHAPTERS: ScopeChapter[] = [MUENCHEN, HAMBURG, COPENHAGEN];

// admin.muenchen@cwa.local
const muenchenAdmin: Access = {
  ...none,
  memberships: [{ chapterId: MUENCHEN.id, roles: parseRoles("admin") }],
};
// pilot@cwa.local — approved in both German chapters
const twoChapterPilot: Access = {
  ...none,
  memberships: [
    { chapterId: MUENCHEN.id, roles: ["pilot"] },
    { chapterId: HAMBURG.id, roles: ["pilot"] },
  ],
};
// multi@cwa.local — country admin DK *and* pilot+admin of a German chapter
const multi: Access = {
  ...none,
  countryAdminOf: [DK],
  memberships: [{ chapterId: HAMBURG.id, roles: parseRoles("admin,pilot") }],
};

const scopeOf = (a: Access) => resolveAdminScope(a, COUNTRIES, CHAPTERS);
const slugs = (s: AdminScope) => s.chapters.map((c) => c.slug).sort();
const codes = (s: AdminScope) => s.countries.map((c) => c.code).sort();

describe("hasAnyAdminScope", () => {
  it("lets anyone who administers something through", () => {
    expect(hasAnyAdminScope(superadmin)).toBe(true);
    expect(hasAnyAdminScope(deAdmin)).toBe(true);
    expect(hasAnyAdminScope(muenchenAdmin)).toBe(true);
    expect(hasAnyAdminScope(multi)).toBe(true);
  });

  it("reads admin out of a stacked membership role string", () => {
    const both: Access = {
      ...none,
      memberships: [
        { chapterId: HAMBURG.id, roles: parseRoles("pilot,admin") },
      ],
    };
    expect(hasAnyAdminScope(both)).toBe(true);
  });

  // The regression this exists for: /admin was reachable by any signed-in account.
  it("keeps pilots, passengers and fresh sign-ups out", () => {
    expect(hasAnyAdminScope(berlinPilot)).toBe(false);
    expect(hasAnyAdminScope(twoChapterPilot)).toBe(false);
    expect(hasAnyAdminScope(aarhusPassenger)).toBe(false);
    expect(hasAnyAdminScope(none)).toBe(false);
    expect(hasAnyAdminScope({ ...none, role: "user" })).toBe(false);
  });
});

describe("adminChapterIds", () => {
  it("returns only the chapters administered by an explicit membership row", () => {
    expect(adminChapterIds(multi)).toEqual([HAMBURG.id]);
    expect(adminChapterIds(twoChapterPilot)).toEqual([]);
    expect(adminChapterIds(aarhusPassenger)).toEqual([]);
  });

  it("does not expand inherited authority — that is resolveAdminScope's job", () => {
    expect(adminChapterIds(superadmin)).toEqual([]);
    expect(adminChapterIds(deAdmin)).toEqual([]);
  });
});

describe("resolveAdminScope", () => {
  it("gives a superadmin every country and every chapter", () => {
    const scope = scopeOf(superadmin);
    expect(scope.global).toBe(true);
    expect(codes(scope)).toEqual(["DE", "DK"]);
    expect(slugs(scope)).toEqual(["copenhagen", "hamburg", "muenchen"]);
    expect(scope.canSeeChapters).toBe(true);
    expect(scope.canSeeCountries).toBe(true);
  });

  it("gives a country admin every chapter of their country and nothing abroad", () => {
    const scope = scopeOf(deAdmin);
    expect(scope.global).toBe(false);
    expect(codes(scope)).toEqual(["DE"]);
    expect(slugs(scope)).toEqual(["hamburg", "muenchen"]);
    expect(scope.chapters).not.toContainEqual(COPENHAGEN);
    expect(scope.canSeeChapters).toBe(true);
    expect(scope.canSeeCountries).toBe(false);
  });

  it("gives a chapter admin their chapter only, with no organisation views", () => {
    const scope = scopeOf(muenchenAdmin);
    expect(scope.global).toBe(false);
    expect(scope.countries).toEqual([]);
    expect(scope.chapters).toEqual([MUENCHEN]);
    expect(scope.canSeeChapters).toBe(false);
    expect(scope.canSeeCountries).toBe(false);
  });

  // The role-stacking case a getHighestRole-based implementation gets wrong: it
  // would flatten multi@cwa.local down to "countryAdmin" and lose Hamburg.
  it("unions a stacked country admin and chapter admin instead of flattening", () => {
    const scope = scopeOf(multi);
    expect(scope.global).toBe(false);
    expect(codes(scope)).toEqual(["DK"]);
    expect(slugs(scope)).toEqual(["copenhagen", "hamburg"]);
    expect(scope.chapters).toContainEqual(HAMBURG);
    expect(scope.chapters).toContainEqual(COPENHAGEN);
    expect(scope.chapters).not.toContainEqual(MUENCHEN);
    expect(scope.canSeeChapters).toBe(true);
    expect(scope.canSeeCountries).toBe(false);
  });

  it("counts a chapter admin's own chapter once, not twice", () => {
    const deAdminWhoAlsoRunsMuenchen: Access = {
      ...deAdmin,
      memberships: muenchenAdmin.memberships,
    };
    expect(slugs(scopeOf(deAdminWhoAlsoRunsMuenchen))).toEqual([
      "hamburg",
      "muenchen",
    ]);
  });
});

describe("defaultActiveScope", () => {
  it("opens a superadmin on everything", () => {
    expect(defaultActiveScope(scopeOf(superadmin))).toEqual({ kind: "all" });
  });

  it("opens a country admin on their country", () => {
    expect(defaultActiveScope(scopeOf(deAdmin))).toEqual({
      kind: "country",
      country: COUNTRIES[0],
    });
  });

  it("opens a single-chapter admin on that chapter", () => {
    expect(defaultActiveScope(scopeOf(muenchenAdmin))).toEqual({
      kind: "chapter",
      chapter: MUENCHEN,
    });
  });

  // DK does not cover Hamburg, so defaulting to the country would silently hide
  // a chapter this person actually runs.
  it("does not default to a country that fails to cover every chapter in reach", () => {
    expect(defaultActiveScope(scopeOf(multi))).toEqual({ kind: "all" });
  });
});

describe("resolveActiveScope", () => {
  const deScope = scopeOf(deAdmin);

  it("narrows to a chapter inside the scope", () => {
    expect(resolveActiveScope(deScope, { chapter: "hamburg" })).toEqual({
      kind: "chapter",
      chapter: HAMBURG,
    });
  });

  it("refuses a chapter outside the scope", () => {
    expect(resolveActiveScope(deScope, { chapter: "copenhagen" })).toBeNull();
  });

  it("refuses an unknown slug", () => {
    expect(resolveActiveScope(deScope, { chapter: "atlantis" })).toBeNull();
    expect(resolveActiveScope(deScope, { country: "XX" })).toBeNull();
  });

  it("refuses a country outside the scope", () => {
    expect(resolveActiveScope(deScope, { country: "DK" })).toBeNull();
  });

  it("matches a country code case-insensitively", () => {
    const expected = { kind: "country", country: COUNTRIES[0] };
    expect(resolveActiveScope(deScope, { country: "de" })).toEqual(expected);
    expect(resolveActiveScope(deScope, { country: "De" })).toEqual(expected);
    expect(resolveActiveScope(deScope, { country: "DE" })).toEqual(expected);
  });

  it("prefers the chapter param when both are given", () => {
    expect(
      resolveActiveScope(deScope, { chapter: "muenchen", country: "DE" }),
    ).toEqual({ kind: "chapter", chapter: MUENCHEN });
  });

  it("falls back to the default view with no params", () => {
    for (const access of [superadmin, deAdmin, muenchenAdmin, multi]) {
      const scope = scopeOf(access);
      expect(resolveActiveScope(scope, {})).toEqual(defaultActiveScope(scope));
    }
  });
});

describe("availablePerspectives", () => {
  it("offers only the admin hat to a pure chapter admin", () => {
    expect(availablePerspectives(muenchenAdmin)).toEqual(["admin"]);
    expect(availablePerspectives(deAdmin)).toEqual(["admin"]);
  });

  it("offers both hats to someone who administers and pedals", () => {
    expect(availablePerspectives(multi)).toEqual(["admin", "pilot"]);
  });

  it("offers the pilot hat to a plain pilot and the passenger hat to a passenger", () => {
    expect(availablePerspectives(berlinPilot)).toEqual(["pilot"]);
    expect(availablePerspectives(twoChapterPilot)).toEqual(["pilot"]);
    expect(availablePerspectives(aarhusPassenger)).toEqual(["passenger"]);
  });

  // A superadmin is not implicitly a pilot: riding out takes a real membership.
  it("does not hand a superadmin a pilot hat they never earned", () => {
    expect(availablePerspectives(superadmin)).toEqual(["admin"]);
  });

  it("does hand a superadmin who really pedals both hats", () => {
    expect(
      availablePerspectives({
        ...superadmin,
        memberships: [{ chapterId: MUENCHEN.id, roles: ["pilot"] }],
      }),
    ).toEqual(["admin", "pilot"]);
  });

  it("offers nothing to a fresh sign-up", () => {
    expect(availablePerspectives(none)).toEqual([]);
  });
});
