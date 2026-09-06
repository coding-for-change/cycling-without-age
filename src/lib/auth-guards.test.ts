import { auth } from "@/lib/auth";
import { chapters } from "@/features/chapters";
import {
  getHighestRole,
  getSession,
  requireAuth,
  requireChapterAdmin,
  requireChapterRole,
  requireCountryAdmin,
  requireSuperAdmin,
} from "@/lib/auth-guards";
import type { Access } from "@/lib/access";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  // No request scope in tests — dedupe would leak one test's session into the next.
  cache: (fn: unknown) => fn,
}));
jest.mock("next/headers", () => ({ headers: async () => new Headers() }));
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock("@/features/chapters", () => ({
  chapters: { getChapterCountryId: jest.fn() },
}));

const getSessionMock = auth.api.getSession as unknown as jest.Mock;
const getChapterCountryId = chapters.getChapterCountryId as jest.Mock;

const DE = "country-de";
const DK = "country-dk";
const BERLIN = "chapter-berlin";
const AARHUS = "chapter-aarhus";
const UNKNOWN = "chapter-ghost";

const signedInAs = (access: Partial<Access>) =>
  getSessionMock.mockResolvedValue({
    user: { id: "u1" },
    session: { id: "s1" },
    access: { role: null, countryAdminOf: [], memberships: [], ...access },
  });

const denied = (run: () => Promise<unknown>) =>
  expect(run()).rejects.toThrow("REDIRECT:/");

beforeEach(() => {
  jest.clearAllMocks();
  getChapterCountryId.mockImplementation(async (id: string) =>
    id === BERLIN ? DE : id === AARHUS ? DK : null,
  );
});

describe("a visitor who is not signed in", () => {
  beforeEach(() => getSessionMock.mockResolvedValue(null));

  it("gets null from getSession without redirecting", async () => {
    await expect(getSession()).resolves.toBeNull();
  });

  it("cannot reach anything behind a guard", async () => {
    await denied(requireAuth);
    await denied(requireSuperAdmin);
    await denied(() => requireCountryAdmin(DE));
    await denied(() => requireChapterAdmin(BERLIN));
    await denied(() => requireChapterRole(BERLIN, "passenger"));
  });
});

describe("a user who just signed up (no roles yet)", () => {
  beforeEach(() => signedInAs({}));

  it("passes requireAuth", async () => {
    await expect(requireAuth()).resolves.toMatchObject({ user: { id: "u1" } });
  });

  it("has no role to report", async () => {
    expect(getHighestRole(await requireAuth())).toBeNull();
  });

  it("cannot administrate anything", async () => {
    await denied(requireSuperAdmin);
    await denied(() => requireCountryAdmin(DE));
    await denied(() => requireChapterAdmin(BERLIN));
    await denied(() => requireChapterRole(BERLIN, "pilot"));
    await denied(() => requireChapterRole(BERLIN, "passenger"));
  });
});

describe("a passenger of Aarhus", () => {
  beforeEach(() =>
    signedInAs({ memberships: [{ chapterId: AARHUS, roles: ["passenger"] }] }),
  );

  it("passes the passenger check for its own chapter", async () => {
    await expect(requireChapterRole(AARHUS, "passenger")).resolves.toBeTruthy();
  });

  it("cannot act as a pilot, nor in another chapter", async () => {
    await denied(() => requireChapterRole(AARHUS, "pilot"));
    await denied(() => requireChapterRole(BERLIN, "passenger"));
    await denied(() => requireChapterAdmin(AARHUS));
  });
});

describe("a pilot of Berlin", () => {
  beforeEach(() =>
    signedInAs({ memberships: [{ chapterId: BERLIN, roles: ["pilot"] }] }),
  );

  it("passes the pilot check for Berlin", async () => {
    await expect(requireChapterRole(BERLIN, "pilot")).resolves.toBeTruthy();
  });

  it("cannot pilot another chapter or administrate its own", async () => {
    await denied(() => requireChapterRole(AARHUS, "pilot"));
    await denied(() => requireChapterAdmin(BERLIN));
    await denied(() => requireCountryAdmin(DE));
  });
});

describe("an admin of Berlin", () => {
  beforeEach(() =>
    signedInAs({ memberships: [{ chapterId: BERLIN, roles: ["admin"] }] }),
  );

  it("administrates Berlin without a country lookup", async () => {
    await expect(requireChapterAdmin(BERLIN)).resolves.toBeTruthy();
    expect(getChapterCountryId).not.toHaveBeenCalled();
  });

  it("satisfies any chapter role check for Berlin", async () => {
    await expect(requireChapterRole(BERLIN, "pilot")).resolves.toBeTruthy();
    await expect(requireChapterRole(BERLIN, "passenger")).resolves.toBeTruthy();
  });

  it("cannot administrate another chapter or its country", async () => {
    await denied(() => requireChapterAdmin(AARHUS));
    await denied(() => requireChapterRole(AARHUS, "pilot"));
    await denied(() => requireCountryAdmin(DE));
    await denied(requireSuperAdmin);
  });
});

describe("a country admin of Germany", () => {
  beforeEach(() => signedInAs({ countryAdminOf: [DE] }));

  it("administrates a German chapter it is not a member of", async () => {
    await expect(requireChapterAdmin(BERLIN)).resolves.toBeTruthy();
    expect(getChapterCountryId).toHaveBeenCalledWith(BERLIN);
  });

  it("satisfies chapter role checks in its own country", async () => {
    await expect(requireChapterRole(BERLIN, "pilot")).resolves.toBeTruthy();
  });

  it("cannot reach into another country", async () => {
    await denied(() => requireChapterAdmin(AARHUS));
    await denied(() => requireChapterRole(AARHUS, "pilot"));
    await denied(() => requireCountryAdmin(DK));
    await denied(requireSuperAdmin);
  });

  it("cannot administrate a chapter with no resolvable country", async () => {
    await denied(() => requireChapterAdmin(UNKNOWN));
  });
});

describe("a superadmin", () => {
  beforeEach(() => signedInAs({ role: "superadmin" }));

  it("passes every guard, in every country", async () => {
    await expect(requireSuperAdmin()).resolves.toBeTruthy();
    await expect(requireCountryAdmin(DK)).resolves.toBeTruthy();
    await expect(requireChapterAdmin(AARHUS)).resolves.toBeTruthy();
    await expect(requireChapterRole(AARHUS, "pilot")).resolves.toBeTruthy();
  });

  it("administrates even a chapter with no resolvable country", async () => {
    await expect(requireChapterAdmin(UNKNOWN)).resolves.toBeTruthy();
  });
});
