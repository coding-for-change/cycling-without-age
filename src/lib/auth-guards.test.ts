import { auth } from "@/lib/auth";
import { chapters } from "@/features/chapters";
import { profile } from "@/features/profile";
import {
  getHighestRole,
  getSession,
  homeOf,
  requireAdminScope,
  requireAuth,
  requireChapterAdmin,
  requireChapterRole,
  requireCountryAdmin,
  requireCountryAdminOfChapter,
  readNextPath,
  requirePerspective,
  requireSuperAdmin,
} from "@/lib/auth-guards";
import { NEXT_COOKIE } from "@/lib/redirects";
import type { Access } from "@/lib/access";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  // No request scope in tests — dedupe would leak one test's session into the next.
  cache: (fn: unknown) => fn,
}));
// Mutable, because `x-pathname` and the `cwa.next` cookie are exactly what the
// redirect targets are read from.
const requestHeaders = new Headers();
const requestCookies = new Map<string, string>();

jest.mock("next/headers", () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({
    get: (name: string) => {
      const value = requestCookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  forbidden: () => {
    throw new Error("FORBIDDEN");
  },
}));
jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfile: jest.fn() },
}));
jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapterCountryId: jest.fn(),
    listCountries: jest.fn(),
    listChapters: jest.fn(),
  },
}));

const getSessionMock = auth.api.getSession as unknown as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const getChapterCountryId = chapters.getChapterCountryId as jest.Mock;
const listCountries = chapters.listCountries as jest.Mock;
const listChapters = chapters.listChapters as jest.Mock;

const DE = "country-de";
const DK = "country-dk";
const BERLIN = "chapter-berlin";
const AARHUS = "chapter-aarhus";
const UNKNOWN = "chapter-ghost";

// Full rows, as the facade really returns them — the guard is expected to project
// them down to the four fields AdminScope carries.
const COUNTRY_ROWS = [
  { id: DE, code: "DE", name: "Deutschland", createdAt: new Date(0) },
  { id: DK, code: "DK", name: "Danmark", createdAt: new Date(0) },
];
const CHAPTER_ROWS = [
  {
    id: BERLIN,
    slug: "berlin",
    name: "Berlin",
    countryId: DE,
    city: "Berlin",
    latitude: 52.5,
    longitude: 13.4,
  },
  {
    id: AARHUS,
    slug: "aarhus",
    name: "Aarhus",
    countryId: DK,
    city: "Aarhus",
    latitude: 56.2,
    longitude: 10.2,
  },
];
const BERLIN_SCOPE = {
  id: BERLIN,
  slug: "berlin",
  name: "Berlin",
  countryId: DE,
};
const AARHUS_SCOPE = {
  id: AARHUS,
  slug: "aarhus",
  name: "Aarhus",
  countryId: DK,
};
const DE_SCOPE = { id: DE, code: "DE", name: "Deutschland" };

// One enrolled passkey by default: the admin MFA gate is a separate rule with
// its own tests, and every other case would otherwise be answered by it.
const signedInAs = (access: Partial<Access>, passkeys = 1) => {
  getProfile.mockResolvedValue({ _count: { passkeys } });
  return getSessionMock.mockResolvedValue({
    user: { id: "u1" },
    session: { id: "s1" },
    access: { role: null, countryAdminOf: [], memberships: [], ...access },
  });
};

const sessionWith = (access: Partial<Access>) => ({
  access: { role: null, countryAdminOf: [], memberships: [], ...access },
});

const denied = (run: () => Promise<unknown>) =>
  expect(run()).rejects.toThrow("FORBIDDEN");

// A signed-out visitor never reaches the 403: `requireAuth` sends them to sign in
// first, which is the one authorization outcome that stays a redirect.
const sentToSignIn = (run: () => Promise<unknown>) =>
  expect(run()).rejects.toThrow("REDIRECT:/sign-in");

// The exact target, so `/sign-in` and `/sign-in?next=…` cannot pass for each other.
const redirectedTo = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return (error as Error).message.replace("REDIRECT:", "");
  }
  return "<no redirect>";
};

beforeEach(() => {
  jest.clearAllMocks();
  requestHeaders.delete("x-pathname");
  requestCookies.clear();
  getChapterCountryId.mockImplementation(async (id: string) =>
    id === BERLIN ? DE : id === AARHUS ? DK : null,
  );
  listCountries.mockResolvedValue(COUNTRY_ROWS);
  listChapters.mockResolvedValue(CHAPTER_ROWS);
});

describe("a visitor who is not signed in", () => {
  beforeEach(() => getSessionMock.mockResolvedValue(null));

  it("gets null from getSession without redirecting", async () => {
    await expect(getSession()).resolves.toBeNull();
  });

  it("cannot reach anything behind a guard", async () => {
    await sentToSignIn(requireAuth);
    await sentToSignIn(requireSuperAdmin);
    await sentToSignIn(() => requireCountryAdmin(DE));
    await sentToSignIn(() => requireChapterAdmin(BERLIN));
    await sentToSignIn(() => requireChapterRole(BERLIN, "passenger"));
    await sentToSignIn(requireAdminScope);
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

  // Never a 403 on a dashboard: they are lost, not intruding.
  it("is sent to the dispatcher instead of the admin dashboard", async () => {
    expect(await redirectedTo(requireAdminScope)).toBe("/onboarding");
  });

  // The pending applicant: no role yet, so the pilot status screen is theirs.
  it("keeps the pilot perspective, having no home of its own", async () => {
    await expect(requirePerspective("pilot")).resolves.toBeTruthy();
    await expect(requirePerspective("passenger")).resolves.toBeTruthy();
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

  it("is sent to its own home instead of the admin dashboard", async () => {
    expect(await redirectedTo(requireAdminScope)).toBe("/passenger");
    expect(listChapters).not.toHaveBeenCalled();
  });

  it("is sent home from a perspective that is not its own", async () => {
    await expect(requirePerspective("passenger")).resolves.toBeTruthy();
    expect(await redirectedTo(() => requirePerspective("pilot"))).toBe(
      "/passenger",
    );
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

  // The regression: /admin used to sit behind requireAuth alone, so a pilot got in.
  it("is sent to /pilot instead of the admin dashboard", async () => {
    expect(await redirectedTo(requireAdminScope)).toBe("/pilot");
    expect(listChapters).not.toHaveBeenCalled();
  });

  it("is sent home from the passenger perspective", async () => {
    expect(await redirectedTo(() => requirePerspective("passenger"))).toBe(
      "/pilot",
    );
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

  // Editing the chapter record itself is the country admin's job, not theirs.
  it("cannot edit its own chapter's record", async () => {
    await denied(() => requireCountryAdminOfChapter(BERLIN));
  });

  it("opens the admin dashboard scoped to Berlin alone", async () => {
    const { session, scope } = await requireAdminScope();
    expect(session.user.id).toBe("u1");
    expect(scope).toEqual({
      global: false,
      countries: [],
      chapters: [BERLIN_SCOPE],
      canSeeChapters: false,
      canSeeCountries: false,
    });
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

  it("edits the record of a chapter in its country, and of no other", async () => {
    await expect(requireCountryAdminOfChapter(BERLIN)).resolves.toBeTruthy();
    await denied(() => requireCountryAdminOfChapter(AARHUS));
    await denied(() => requireCountryAdminOfChapter(UNKNOWN));
  });

  it("opens the admin dashboard on Germany, without the countries view", async () => {
    const { scope } = await requireAdminScope();
    expect(scope).toEqual({
      global: false,
      countries: [DE_SCOPE],
      chapters: [BERLIN_SCOPE],
      canSeeChapters: true,
      canSeeCountries: false,
    });
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

  it("opens the admin dashboard on everything", async () => {
    const { scope } = await requireAdminScope();
    expect(scope).toEqual({
      global: true,
      countries: [DE_SCOPE, { id: DK, code: "DK", name: "Danmark" }],
      chapters: [BERLIN_SCOPE, AARHUS_SCOPE],
      canSeeChapters: true,
      canSeeCountries: true,
    });
  });
});

describe("coming back to where you were", () => {
  beforeEach(() => getSessionMock.mockResolvedValue(null));

  it("names the page they were on as the sign-in target", async () => {
    requestHeaders.set("x-pathname", "/join/muenchen/ride");
    expect(await redirectedTo(requireAuth)).toBe(
      "/sign-in?next=%2Fjoin%2Fmuenchen%2Fride",
    );
  });

  it("keeps the query string of that page", async () => {
    requestHeaders.set("x-pathname", "/admin/members?chapter=berlin");
    expect(await redirectedTo(requireAuth)).toBe(
      "/sign-in?next=%2Fadmin%2Fmembers%3Fchapter%3Dberlin",
    );
  });

  it("falls back to a bare sign-in when the header is not a safe path", async () => {
    requestHeaders.set("x-pathname", "//evil.com");
    expect(await redirectedTo(requireAuth)).toBe("/sign-in");
  });

  it("refuses to send anyone back into the flow they are already in", async () => {
    requestHeaders.set("x-pathname", "/sign-in/code");
    expect(await redirectedTo(requireAuth)).toBe("/sign-in");
  });

  it("reads the parked destination only when it is safe", async () => {
    requestCookies.set(NEXT_COOKIE, "/pilot");
    await expect(readNextPath()).resolves.toBe("/pilot");

    requestCookies.set(NEXT_COOKIE, "https://evil.com");
    await expect(readNextPath()).resolves.toBeNull();
  });
});

describe("homeOf", () => {
  it("answers with the home of the highest role", () => {
    expect(homeOf(sessionWith({ role: "superadmin" }))).toBe("/admin");
    expect(homeOf(sessionWith({ countryAdminOf: [DE] }))).toBe("/admin");
    expect(
      homeOf(
        sessionWith({ memberships: [{ chapterId: BERLIN, roles: ["pilot"] }] }),
      ),
    ).toBe("/pilot");
  });

  it("sends someone with no role at all to the dispatcher", () => {
    expect(homeOf(sessionWith({}))).toBe("/onboarding");
  });
});

describe("the admin passkey gate", () => {
  it("sends an admin without a passkey to enrol one, before any query runs", async () => {
    signedInAs({ memberships: [{ chapterId: BERLIN, roles: ["admin"] }] }, 0);

    expect(await redirectedTo(requireAdminScope)).toBe(
      "/onboarding/passkey?required=1&next=%2Fadmin",
    );
    expect(await redirectedTo(() => requireChapterAdmin(BERLIN))).toBe(
      "/onboarding/passkey?required=1&next=%2Fadmin",
    );
    expect(listChapters).not.toHaveBeenCalled();
  });

  it("comes back to the page the admin was actually on", async () => {
    signedInAs({ role: "superadmin" }, 0);
    requestHeaders.set("x-pathname", "/admin/countries");

    expect(await redirectedTo(requireSuperAdmin)).toBe(
      "/onboarding/passkey?required=1&next=%2Fadmin%2Fcountries",
    );
    expect(await redirectedTo(() => requireCountryAdmin(DE))).toBe(
      "/onboarding/passkey?required=1&next=%2Fadmin%2Fcountries",
    );
  });

  it("lets an enrolled admin through", async () => {
    signedInAs({ memberships: [{ chapterId: BERLIN, roles: ["admin"] }] });

    await expect(requireChapterAdmin(BERLIN)).resolves.toBeTruthy();
    await expect(requireAdminScope()).resolves.toBeTruthy();
  });

  // A pilot passing a chapter-role check is not an admin and is never asked.
  it("never asks a pilot for one", async () => {
    signedInAs({ memberships: [{ chapterId: BERLIN, roles: ["pilot"] }] }, 0);

    await expect(requireChapterRole(BERLIN, "pilot")).resolves.toBeTruthy();
    expect(getProfile).not.toHaveBeenCalled();
  });
});
