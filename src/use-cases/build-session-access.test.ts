import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildSessionAccess } from "@/use-cases/build-session-access";
import {
  getHighestRole,
  requireAuth,
  requireChapterAdmin,
  requireChapterRole,
  requireCountryAdmin,
  requireSuperAdmin,
} from "@/lib/auth-guards";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: (fn: unknown) => fn,
}));
jest.mock("next/headers", () => ({ headers: async () => new Headers() }));
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
jest.mock("@/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    member: { findMany: jest.fn() },
    countryAdmin: { findMany: jest.fn() },
    organization: { findUnique: jest.fn() },
  },
}));

const db = prisma as unknown as {
  member: { findMany: jest.Mock };
  countryAdmin: { findMany: jest.Mock };
  organization: { findUnique: jest.Mock };
};
const getSessionMock = auth.api.getSession as unknown as jest.Mock;

const DE = "country-de";
const DK = "country-dk";
const BERLIN = "chapter-berlin";
const AARHUS = "chapter-aarhus";

const CHAPTER_ROWS: Record<string, string> = { [BERLIN]: DE, [AARHUS]: DK };
const MEMBER_ROWS = [
  { userId: "anna", organizationId: BERLIN, role: "pilot" },
  { userId: "bo", organizationId: AARHUS, role: "passenger" },
  { userId: "cem", organizationId: BERLIN, role: "admin,pilot" },
  // Runs Germany, but is only a passenger where she rides.
  { userId: "dana", organizationId: AARHUS, role: "passenger" },
];
const COUNTRY_ADMIN_ROWS = [{ userId: "dana", countryId: DE }];
const GLOBAL_ROLES: Record<string, string> = { eve: "superadmin" };

// Signs the user in the way the app does: rows -> buildSessionAccess -> session.
async function signIn(userId: string) {
  const access = await buildSessionAccess(userId, GLOBAL_ROLES[userId] ?? null);
  getSessionMock.mockResolvedValue({
    user: { id: userId },
    session: { id: `s-${userId}` },
    access,
  });
  return access;
}

const denied = (run: () => Promise<unknown>) =>
  expect(run()).rejects.toThrow("REDIRECT:/");

beforeEach(() => {
  jest.clearAllMocks();
  db.member.findMany.mockImplementation(
    async ({ where }: { where: { userId: string } }) =>
      MEMBER_ROWS.filter((m) => m.userId === where.userId).map(
        ({ organizationId, role }) => ({ organizationId, role }),
      ),
  );
  db.countryAdmin.findMany.mockImplementation(
    async ({ where }: { where: { userId: string } }) =>
      COUNTRY_ADMIN_ROWS.filter((c) => c.userId === where.userId).map(
        ({ countryId }) => ({ countryId }),
      ),
  );
  db.organization.findUnique.mockImplementation(
    async ({ where }: { where: { id: string } }) =>
      CHAPTER_ROWS[where.id] ? { countryId: CHAPTER_ROWS[where.id] } : null,
  );
});

describe("buildSessionAccess", () => {
  it("reads both role sources in one pass", async () => {
    expect(await signIn("dana")).toEqual({
      role: null,
      countryAdminOf: [DE],
      memberships: [{ chapterId: AARHUS, roles: ["passenger"] }],
    });
  });

  it("splits a stacked member row into roles", async () => {
    expect((await signIn("cem")).memberships).toEqual([
      { chapterId: BERLIN, roles: ["admin", "pilot"] },
    ]);
  });

  it("gives a brand-new sign-up an empty access object", async () => {
    expect(await signIn("newcomer")).toEqual({
      role: null,
      countryAdminOf: [],
      memberships: [],
    });
  });

  it("carries the global role through untouched", async () => {
    expect((await signIn("eve")).role).toBe("superadmin");
  });
});

describe("what each persona can do after signing in", () => {
  it("brand-new sign-up: in, but nowhere near a chapter", async () => {
    await signIn("newcomer");
    expect(getHighestRole(await requireAuth())).toBeNull();
    await denied(requireSuperAdmin);
    await denied(() => requireCountryAdmin(DE));
    await denied(() => requireChapterAdmin(BERLIN));
    await denied(() => requireChapterRole(BERLIN, "passenger"));
  });

  it("passenger: their own chapter only", async () => {
    await signIn("bo");
    expect(getHighestRole(await requireAuth())).toBe("passenger");
    await expect(requireChapterRole(AARHUS, "passenger")).resolves.toBeTruthy();
    await denied(() => requireChapterRole(AARHUS, "pilot"));
    await denied(() => requireChapterAdmin(AARHUS));
    await denied(() => requireChapterRole(BERLIN, "passenger"));
  });

  it("pilot: rides, does not administrate", async () => {
    await signIn("anna");
    expect(getHighestRole(await requireAuth())).toBe("pilot");
    await expect(requireChapterRole(BERLIN, "pilot")).resolves.toBeTruthy();
    await denied(() => requireChapterAdmin(BERLIN));
    await denied(() => requireChapterRole(AARHUS, "pilot"));
    await denied(() => requireCountryAdmin(DE));
  });

  it("chapter admin: everything in Berlin, nothing above or beside it", async () => {
    await signIn("cem");
    expect(getHighestRole(await requireAuth())).toBe("chapterAdmin");
    await expect(requireChapterAdmin(BERLIN)).resolves.toBeTruthy();
    await expect(requireChapterRole(BERLIN, "passenger")).resolves.toBeTruthy();
    // The membership row answered it — no chapter lookup needed.
    expect(db.organization.findUnique).not.toHaveBeenCalled();
    await denied(() => requireChapterAdmin(AARHUS));
    await denied(() => requireCountryAdmin(DE));
    await denied(requireSuperAdmin);
  });

  it("country admin: every German chapter, no Danish one — despite riding there", async () => {
    await signIn("dana");
    expect(getHighestRole(await requireAuth())).toBe("countryAdmin");
    await expect(requireChapterAdmin(BERLIN)).resolves.toBeTruthy();
    await expect(requireChapterRole(BERLIN, "pilot")).resolves.toBeTruthy();
    await denied(() => requireChapterAdmin(AARHUS));
    await denied(() => requireCountryAdmin(DK));
    await denied(requireSuperAdmin);
  });

  it("superadmin: everything, with no rows at all", async () => {
    await signIn("eve");
    expect(getHighestRole(await requireAuth())).toBe("superadmin");
    await expect(requireSuperAdmin()).resolves.toBeTruthy();
    await expect(requireCountryAdmin(DK)).resolves.toBeTruthy();
    await expect(requireChapterAdmin(AARHUS)).resolves.toBeTruthy();
    await expect(requireChapterRole(AARHUS, "pilot")).resolves.toBeTruthy();
  });

  it("signed-out: no session, no access, every guard closed", async () => {
    getSessionMock.mockResolvedValue(null);
    await denied(requireAuth);
    await denied(requireSuperAdmin);
    await denied(() => requireChapterAdmin(BERLIN));
    expect(db.member.findMany).not.toHaveBeenCalled();
  });
});
