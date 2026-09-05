import { readActiveScope } from "@/app/admin/active-scope";
import { requireAdminScope } from "@/lib/auth-guards";
import type { AdminScope } from "@/lib/access";

jest.mock("next/navigation", () => ({
  forbidden: () => {
    throw new Error("FORBIDDEN");
  },
}));
jest.mock("@/lib/auth-guards", () => ({ requireAdminScope: jest.fn() }));

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

// A country admin of Germany: two German chapters in reach, Denmark out of it.
const scope: AdminScope = {
  global: false,
  countries: [{ id: DE, code: "DE", name: "Deutschland" }],
  chapters: [BERLIN, HAMBURG],
  canSeeChapters: true,
  canSeeCountries: false,
};

const read = (params: Record<string, string | string[] | undefined>) =>
  readActiveScope(Promise.resolve(params));

beforeEach(() => {
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

  // The escalation attempt: a chapter slug outside the scope must not fall back
  // to the default view, which would make the URL a silent no-op.
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
});
