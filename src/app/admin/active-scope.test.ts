import { readActiveScope } from "@/app/admin/active-scope";
import { requireAdminScope } from "@/lib/auth-guards";
import type { AdminScope } from "@/lib/access";

jest.mock("next/navigation", () => ({
  forbidden: () => {
    throw new Error("FORBIDDEN");
  },
}));
jest.mock("@/lib/auth-guards", () => ({ requireAdminScope: jest.fn() }));

let storedScope: string | undefined;
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (storedScope ? { value: storedScope } : undefined),
  }),
}));

const DE = "country-de";
const BERLIN = {
  id: "c-berlin",
  slug: "berlin",
  name: "Berlin",
  countryId: DE,
};
const HAMBURG = {
  id: "c-hamburg",
  slug: "hamburg",
  name: "Hamburg",
  countryId: DE,
};

const scope: AdminScope = {
  global: false,
  countries: [{ id: DE, code: "DE", name: "Deutschland" }],
  chapters: [BERLIN, HAMBURG],
  canSeeChapters: true,
  canSeeCountries: false,
  canCreateCountries: false,
  canDeleteAccounts: false,
  canSeeGlobalEvents: false,
};

const read = (params: Record<string, string | string[] | undefined>) =>
  readActiveScope(Promise.resolve(params));

beforeEach(() => {
  storedScope = undefined;
  (requireAdminScope as jest.Mock).mockResolvedValue({
    session: { user: { id: "u1" } },
    scope,
  });
});

describe("readActiveScope", () => {
  it("opens on the widest view in reach when nothing is asked for", async () => {
    const { active, chapterIds } = await read({});
    expect(active).toEqual({ kind: "country", country: scope.countries[0] });
    expect(chapterIds).toEqual([BERLIN.id, HAMBURG.id]);
  });

  it("narrows to a chapter the caller administrates", async () => {
    const { active, chapters, chapterIds } = await read({ chapter: "hamburg" });
    expect(active).toEqual({ kind: "chapter", chapter: HAMBURG });
    expect(chapters).toEqual([HAMBURG]);
    expect(chapterIds).toEqual([HAMBURG.id]);
  });

  it("refuses a chapter outside the caller's authority", async () => {
    await expect(read({ chapter: "aarhus" })).rejects.toThrow("FORBIDDEN");
  });

  it("refuses a country outside the caller's authority", async () => {
    await expect(read({ country: "DK" })).rejects.toThrow("FORBIDDEN");
  });

  it("reads a repeated param as its first value", async () => {
    const { active } = await read({ chapter: ["berlin", "aarhus"] });
    expect(active).toEqual({ kind: "chapter", chapter: BERLIN });
  });

  it("keeps the stored scope when the URL asks for none", async () => {
    storedScope = "chapter:hamburg";
    const { active, scopeQuery, chapterIds } = await read({});
    expect(active).toEqual({ kind: "chapter", chapter: HAMBURG });
    expect(chapterIds).toEqual([HAMBURG.id]);
    expect(scopeQuery).toBe("");
  });

  it("lets an explicit param win over the stored scope", async () => {
    storedScope = "chapter:hamburg";
    const { active, scopeQuery } = await read({ chapter: "berlin" });
    expect(active).toEqual({ kind: "chapter", chapter: BERLIN });
    expect(scopeQuery).toBe("?chapter=berlin");
  });

  it("falls back to the default when the stored scope is out of reach", async () => {
    storedScope = "country:DK";
    const { active } = await read({});
    expect(active).toEqual({ kind: "country", country: scope.countries[0] });
  });

  it("ignores a malformed stored scope", async () => {
    storedScope = "garbage";
    const { active } = await read({});
    expect(active).toEqual({ kind: "country", country: scope.countries[0] });
  });
});
