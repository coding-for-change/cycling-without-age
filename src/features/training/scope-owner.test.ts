import type { ActiveScope, AdminScope } from "@/lib/access";
import {
  activeOwnerOf,
  requirementOwnerOf,
  uploadOwnerOf,
} from "./scope-owner";

const DE = { id: "country-de", code: "DE", name: "Germany" };
const DK = { id: "country-dk", code: "DK", name: "Denmark" };
const BERLIN = {
  id: "chapter-berlin",
  slug: "berlin",
  name: "Berlin",
  countryId: "country-de",
};
const AARHUS = {
  id: "chapter-aarhus",
  slug: "aarhus",
  name: "Aarhus",
  countryId: "country-dk",
};

const scopeOf = (
  global: boolean,
  countries: AdminScope["countries"],
  chapters: AdminScope["chapters"],
): AdminScope => ({
  global,
  countries,
  chapters,
  canSeeChapters: true,
  canSeeCountries: global,
  canCreateCountries: global,
  canDeleteAccounts: global,
  canSeeGlobalEvents: global,
});

const all: ActiveScope = { kind: "all" };
const germany: ActiveScope = { kind: "country", country: DE };
const berlin: ActiveScope = { kind: "chapter", chapter: BERLIN };
const aarhus: ActiveScope = { kind: "chapter", chapter: AARHUS };

const superadmin = scopeOf(true, [DE, DK], [BERLIN, AARHUS]);
const germanyAdmin = scopeOf(false, [DE], [BERLIN]);
const twoCountries = scopeOf(false, [DE, DK], [BERLIN, AARHUS]);
const berlinAdmin = scopeOf(false, [], [BERLIN]);
const twoChapters = scopeOf(false, [], [BERLIN, AARHUS]);
const germanyAndAarhus = scopeOf(false, [DE], [BERLIN, AARHUS]);

describe("uploadOwnerOf", () => {
  it("puts a superadmin's uploads into the global library in every scope", () => {
    for (const active of [all, germany, berlin])
      expect(uploadOwnerOf(superadmin, active)).toEqual({ scope: "global" });
  });

  it("puts a country admin's uploads into the country, also from a chapter", () => {
    for (const active of [all, germany, berlin])
      expect(uploadOwnerOf(germanyAdmin, active)).toEqual({
        scope: "country",
        countryId: "country-de",
      });
  });

  it("uses the chapter for a chapter a country admin only administers directly", () => {
    expect(uploadOwnerOf(germanyAndAarhus, aarhus)).toEqual({
      scope: "chapter",
      chapterId: "chapter-aarhus",
    });
  });

  it("puts a chapter admin's uploads into the chapter", () => {
    for (const active of [all, berlin])
      expect(uploadOwnerOf(berlinAdmin, active)).toEqual({
        scope: "chapter",
        chapterId: "chapter-berlin",
      });
  });

  it("refuses to guess when several countries or chapters are in view", () => {
    expect(uploadOwnerOf(twoCountries, all)).toBeNull();
    expect(uploadOwnerOf(twoChapters, all)).toBeNull();
    expect(uploadOwnerOf(twoCountries, germany)).toEqual({
      scope: "country",
      countryId: "country-de",
    });
  });
});

describe("requirementOwnerOf", () => {
  it("follows the active scope", () => {
    expect(requirementOwnerOf(superadmin, all)).toEqual({ scope: "global" });
    expect(requirementOwnerOf(superadmin, germany)).toEqual({
      scope: "country",
      countryId: "country-de",
    });
    expect(requirementOwnerOf(superadmin, berlin)).toEqual({
      scope: "chapter",
      chapterId: "chapter-berlin",
    });
    expect(requirementOwnerOf(germanyAdmin, berlin)).toEqual({
      scope: "chapter",
      chapterId: "chapter-berlin",
    });
    expect(requirementOwnerOf(germanyAdmin, all)).toEqual({
      scope: "country",
      countryId: "country-de",
    });
    expect(requirementOwnerOf(berlinAdmin, all)).toEqual({
      scope: "chapter",
      chapterId: "chapter-berlin",
    });
    expect(requirementOwnerOf(twoCountries, all)).toBeNull();
  });
});

describe("activeOwnerOf", () => {
  it("carries the owner's country for inherited requirements", () => {
    expect(activeOwnerOf(superadmin, all)).toEqual({
      owner: { scope: "global" },
      countryId: null,
    });
    expect(activeOwnerOf(germanyAdmin, germany)).toEqual({
      owner: { scope: "country", countryId: "country-de" },
      countryId: "country-de",
    });
    expect(activeOwnerOf(germanyAdmin, berlin)).toEqual({
      owner: { scope: "chapter", chapterId: "chapter-berlin" },
      countryId: "country-de",
    });
    expect(activeOwnerOf(berlinAdmin, all)).toEqual({
      owner: { scope: "chapter", chapterId: "chapter-berlin" },
      countryId: "country-de",
    });
    expect(activeOwnerOf(twoCountries, all)).toBeNull();
  });
});
