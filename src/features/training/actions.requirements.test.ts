import { allowsAdmin, isCountryAdmin, isSuperAdmin } from "@/lib/access";
import type { Access, AdminAuthority } from "@/lib/access";
import { training } from "@/features/training";
import {
  requirementImpact,
  setTrainingRequirement,
} from "@/use-cases/training-requirements";
import {
  removeRequirementAction,
  requirementImpactAction,
  setRequirementAction,
} from "./actions";

const CHAPTER_COUNTRY: Record<string, string> = {
  "chapter-berlin": "country-de",
  "chapter-aarhus": "country-dk",
};

let access: Access;
const session = () => ({ user: { id: "admin-1" }, access });

const forbidden = () => {
  throw new Error("FORBIDDEN");
};

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({ unstable_rethrow: jest.fn() }));
jest.mock("@sentry/nextjs", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/storage", () => ({ withinUploadLimit: () => true }));
jest.mock("@/lib/auth-guards", () => ({
  requireAdminOf: jest.fn(async (authority: AdminAuthority) =>
    allowsAdmin(access, authority) ? session() : forbidden(),
  ),
  requireAdminScope: jest.fn(async () => ({ session: session() })),
  requireCatalogueOwner: jest.fn(
    async (
      owner:
        | { scope: "global" }
        | { scope: "country"; countryId: string }
        | { scope: "chapter"; chapterId: string },
    ) => {
      const ok =
        owner.scope === "global"
          ? isSuperAdmin(access)
          : owner.scope === "country"
            ? isCountryAdmin(access, owner.countryId)
            : allowsAdmin(access, {
                countryIds: [],
                chapters: [
                  {
                    chapterId: owner.chapterId,
                    countryId: CHAPTER_COUNTRY[owner.chapterId],
                  },
                ],
              });
      return ok ? session() : forbidden();
    },
  ),
}));
jest.mock("@/features/training", () => ({
  training: {
    requirementAuthority: jest.fn(),
    removeRequirement: jest.fn(),
  },
}));
jest.mock("@/use-cases/training-requirements", () => ({
  setTrainingRequirement: jest.fn(async () => ({ id: "req-1" })),
  requirementImpact: jest.fn(async () => ({ pilots: 3 })),
}));

const none: Access = { role: null, countryAdminOf: [], memberships: [] };
const berlinAdmin: Access = {
  ...none,
  memberships: [{ chapterId: "chapter-berlin", roles: ["admin"] }],
};
const berlinPilot: Access = {
  ...none,
  memberships: [{ chapterId: "chapter-berlin", roles: ["pilot"] }],
};
const germanyAdmin: Access = { ...none, countryAdminOf: ["country-de"] };

const germany = { scope: "country", countryId: "country-de" };
const denmark = { scope: "country", countryId: "country-dk" };
const berlin = { scope: "chapter", chapterId: "chapter-berlin" };

const set = (owner: unknown) =>
  setRequirementAction({ owner, familyId: "family-1" });
const impact = (owner: unknown) =>
  requirementImpactAction({ owner, familyId: "family-1" });
const authorityIs = (authority: AdminAuthority) =>
  (training.requirementAuthority as jest.Mock).mockResolvedValue(authority);

const DENIED = { ok: false, error: "generic" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("a chapter admin of Berlin", () => {
  beforeEach(() => {
    access = berlinAdmin;
  });

  it("adds to its own chapter but can't set a country or global requirement", async () => {
    await expect(set(berlin)).resolves.toEqual({
      ok: true,
      requirementId: "req-1",
    });
    await expect(set(germany)).resolves.toEqual(DENIED);
    await expect(set({ scope: "global" })).resolves.toEqual(DENIED);
    await expect(impact(germany)).resolves.toEqual(DENIED);
    expect(setTrainingRequirement).toHaveBeenCalledTimes(1);
    expect(requirementImpact).not.toHaveBeenCalled();
  });

  it("can't remove what its country or the global level requires", async () => {
    authorityIs({ chapters: [], countryIds: ["country-de"] });
    await expect(removeRequirementAction("req-1")).resolves.toEqual(DENIED);
    authorityIs({ chapters: [], countryIds: [] });
    await expect(removeRequirementAction("req-1")).resolves.toEqual(DENIED);
    expect(training.removeRequirement).not.toHaveBeenCalled();

    authorityIs({
      chapters: [{ chapterId: "chapter-berlin", countryId: "country-de" }],
      countryIds: [],
    });
    await expect(removeRequirementAction("req-1")).resolves.toEqual({
      ok: true,
    });
  });
});

describe("a country admin of Germany", () => {
  beforeEach(() => {
    access = germanyAdmin;
  });

  it("requires for Germany and its chapters, never for Denmark", async () => {
    await expect(set(germany)).resolves.toMatchObject({ ok: true });
    await expect(set(berlin)).resolves.toMatchObject({ ok: true });
    await expect(set(denmark)).resolves.toEqual(DENIED);
    await expect(
      set({ scope: "chapter", chapterId: "chapter-aarhus" }),
    ).resolves.toEqual(DENIED);
  });

  it("can't touch or preview another country's requirement", async () => {
    authorityIs({ chapters: [], countryIds: ["country-dk"] });
    await expect(removeRequirementAction("req-dk")).resolves.toEqual(DENIED);
    await expect(impact(denmark)).resolves.toEqual(DENIED);
    expect(training.removeRequirement).not.toHaveBeenCalled();
    await expect(impact(germany)).resolves.toEqual({ ok: true, pilots: 3 });
  });
});

describe("a pilot", () => {
  beforeEach(() => {
    access = berlinPilot;
  });

  it("can't call any requirement action", async () => {
    authorityIs({
      chapters: [{ chapterId: "chapter-berlin", countryId: "country-de" }],
      countryIds: [],
    });
    await expect(set(berlin)).resolves.toEqual(DENIED);
    await expect(impact(berlin)).resolves.toEqual(DENIED);
    await expect(removeRequirementAction("req-1")).resolves.toEqual(DENIED);
    expect(setTrainingRequirement).not.toHaveBeenCalled();
    expect(requirementImpact).not.toHaveBeenCalled();
    expect(training.removeRequirement).not.toHaveBeenCalled();
  });
});

it("rejects a malformed owner before any guard runs", async () => {
  access = { ...none, role: "superadmin" };
  await expect(set({ scope: "planet" })).resolves.toEqual(DENIED);
  expect(setTrainingRequirement).not.toHaveBeenCalled();
});
