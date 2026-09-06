import { resolveAdminScope } from "@/lib/access";
import type {
  Access,
  AdminScope,
  Perspective,
  ScopeChapter,
  ScopeCountry,
} from "@/lib/access";
import type { ResolvedCommand } from "@/lib/commands";
import en from "@/lib/i18n/en";
import { adminCommands, type AdminCommandContext } from "./commands";
import { navFor } from "./nav";

const DE: ScopeCountry = { id: "c-de", code: "DE", name: "Germany" };
const DK: ScopeCountry = { id: "c-dk", code: "DK", name: "Denmark" };
const COUNTRIES = [DE, DK];

const chapter = (slug: string, name: string, country: ScopeCountry) => ({
  id: `ch-${slug}`,
  slug,
  name,
  countryId: country.id,
});

const BERLIN = chapter("berlin", "Berlin", DE);
const MUNICH = chapter("munich", "München", DE);
const AARHUS = chapter("aarhus", "Aarhus", DK);
const CHAPTERS: ScopeChapter[] = [BERLIN, MUNICH, AARHUS];

const none: Access = { role: null, countryAdminOf: [], memberships: [] };
const scopeOf = (access: Access) =>
  resolveAdminScope(access, COUNTRIES, CHAPTERS);

const superadmin = scopeOf({ ...none, role: "superadmin" });
const dkAdmin = scopeOf({ ...none, countryAdminOf: [DK.id] });
const berlinAdmin = scopeOf({
  ...none,
  memberships: [{ chapterId: BERLIN.id, roles: ["admin"] }],
});
const stacked = scopeOf({
  ...none,
  countryAdminOf: [DK.id],
  memberships: [{ chapterId: BERLIN.id, roles: ["admin"] }],
});

const ctx = (
  perspectives: Perspective[] = ["admin"],
  locale: AdminCommandContext["locale"] = "en",
): AdminCommandContext => ({ perspectives, locale });

const run = (scope: AdminScope, context = ctx()) =>
  adminCommands(en, scope, context);

const inGroup = (commands: ResolvedCommand[], group: string) =>
  commands.filter((c) => c.group === group);

const hrefs = (commands: ResolvedCommand[]) =>
  inGroup(commands, "navigate").flatMap((c) =>
    c.run.kind === "navigate" ? [c.run.href] : [],
  );

const labels = (commands: ResolvedCommand[], group: string) =>
  inGroup(commands, group).map((c) => c.label);

describe("navigate parity with NAV", () => {
  it.each([
    ["superadmin", superadmin],
    ["country admin", dkAdmin],
    ["chapter admin", berlinAdmin],
    ["country admin + foreign chapter admin", stacked],
  ])("covers every visible row exactly once for a %s", (_label, scope) => {
    expect([...hrefs(run(scope))].sort()).toEqual(
      navFor(scope)
        .map((item) => item.href)
        .sort(),
    );
  });

  it("keeps the sidebar's own order", () => {
    expect(hrefs(run(superadmin))).toEqual(
      navFor(superadmin).map((item) => item.href),
    );
  });

  it("carries each row's icon, so the palette and sidebar cannot diverge", () => {
    const icons = new Map(
      inGroup(run(superadmin), "navigate").map((c) => [
        c.run.kind === "navigate" ? c.run.href : c.id,
        c.icon,
      ]),
    );
    for (const item of navFor(superadmin))
      expect(icons.get(item.href)).toBe(item.icon);
  });

  it("labels a destination with its own name, not a sentence", () => {
    expect(labels(run(superadmin), "navigate")).toContain(en.admin.nav.members);
  });
});

describe("scope-dependent destinations", () => {
  it("gives a superadmin both Chapters and Countries", () => {
    expect(hrefs(run(superadmin))).toEqual(
      expect.arrayContaining(["/admin/chapters", "/admin/countries"]),
    );
  });

  it("gives a country admin Chapters but not Countries", () => {
    expect(hrefs(run(dkAdmin))).toContain("/admin/chapters");
    expect(hrefs(run(dkAdmin))).not.toContain("/admin/countries");
  });

  it("gives a chapter admin neither", () => {
    expect(hrefs(run(berlinAdmin))).not.toContain("/admin/chapters");
    expect(hrefs(run(berlinAdmin))).not.toContain("/admin/countries");
  });

  it("gives a stacked country + chapter admin Chapters but not Countries", () => {
    expect(hrefs(run(stacked))).toContain("/admin/chapters");
    expect(hrefs(run(stacked))).not.toContain("/admin/countries");
  });
});

describe("create group", () => {
  const ids = (scope: AdminScope) =>
    inGroup(run(scope), "create").map((c) => c.id);

  it("gives a superadmin both a new chapter and a new country", () => {
    expect(ids(superadmin)).toEqual(
      expect.arrayContaining(["new-chapter", "new-country"]),
    );
  });

  it("gives a country admin a new chapter but not a new country", () => {
    expect(ids(dkAdmin)).toContain("new-chapter");
    expect(ids(dkAdmin)).not.toContain("new-country");
  });

  it("gives a chapter admin neither", () => {
    expect(ids(berlinAdmin)).not.toContain("new-chapter");
    expect(ids(berlinAdmin)).not.toContain("new-country");
  });

  it("opens the form on the page that owns it", () => {
    const targets = inGroup(run(superadmin), "create").flatMap((c) =>
      c.run.kind === "navigate" ? [[c.id, c.run.href]] : [],
    );
    expect(targets).toEqual(
      expect.arrayContaining([
        ["new-chapter", "/admin/chapters?new=1"],
        ["new-country", "/admin/countries?new=1"],
      ]),
    );
  });

  it("stays out of the navigate group, so NAV parity is untouched", () => {
    expect(hrefs(run(superadmin))).not.toContain("/admin/chapters?new=1");
  });
});

describe("scope group", () => {
  it("is omitted for a single-chapter admin", () => {
    expect(inGroup(run(berlinAdmin), "scope")).toEqual([]);
  });

  it("offers every chapter in reach across both roles, plus all-chapters", () => {
    const commands = inGroup(run(stacked), "scope");
    expect(commands.map((c) => c.run.kind === "action" && c.run.arg)).toEqual([
      "all",
      "country:DK",
      "chapter:berlin",
      "chapter:aarhus",
    ]);
    expect(commands.map((c) => c.label)).toEqual([
      en.admin.scope.all,
      "All chapters in Denmark",
      "Berlin",
      "Aarhus",
    ]);
  });

  it("routes every entry through the scope.set action", () => {
    for (const command of inGroup(run(superadmin), "scope"))
      expect(command.run).toMatchObject({ kind: "action", id: "scope.set" });
  });
});

describe("perspective group", () => {
  it("is omitted when there is only one hat to wear", () => {
    expect(inGroup(run(superadmin, ctx(["admin"])), "perspective")).toEqual([]);
  });

  it("sends each hat to its own home", () => {
    const commands = inGroup(
      run(superadmin, ctx(["admin", "pilot"])),
      "perspective",
    );
    expect(
      commands.map((c) => c.run.kind === "navigate" && c.run.href),
    ).toEqual(["/admin", "/pilot"]);
  });
});

describe("account group", () => {
  it("omits the locale already in use", () => {
    const ids = inGroup(run(superadmin, ctx(["admin"], "da")), "account").map(
      (c) => c.id,
    );
    expect(ids).toEqual([
      "locale:en",
      "locale:de",
      "sidebar-toggle",
      "sign-out",
    ]);
  });

  it("names the language in its own words", () => {
    expect(labels(run(superadmin), "account")).toContain("Language: Dansk");
  });
});

describe("ids", () => {
  it.each([
    ["superadmin", superadmin, ctx(["admin", "pilot", "passenger"], "de")],
    ["chapter admin", berlinAdmin, ctx()],
    ["stacked admin", stacked, ctx(["admin", "pilot"], "da")],
  ])("are unique across every group for a %s", (_label, scope, context) => {
    const ids = run(scope, context).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
