import {
  getHighestRole,
  hasChapterRole,
  isChapterAdmin,
  isCountryAdmin,
  isSuperAdmin,
  parseRoles,
} from "@/lib/access";
import type { Access } from "@/lib/access";

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
