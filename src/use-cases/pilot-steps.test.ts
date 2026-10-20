import { membership } from "@/features/membership";
import { personProfiles } from "@/features/person-profiles";
import { training } from "@/features/training";
import { activity } from "@/lib/activity";
import { requireAdminScope } from "@/lib/auth-guards";
import { allowsAdmin, type Access, type AdminAuthority } from "@/lib/access";
import {
  confirmInPersonTraining,
  grantTrainingExemption,
  revokeInPersonTraining,
  revokeTrainingExemption,
} from "./pilot-steps";

const FORBIDDEN = "NEXT_HTTP_ERROR_FALLBACK;403";

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T>(fn: T) => fn,
}));
jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapterCountryIds: jest.fn(
      async (ids: string[]) => new Map(ids.map((id) => [id, "country-dk"])),
    ),
  },
}));
jest.mock("@/features/membership", () => ({
  membership: {
    listMembershipsOfUser: jest.fn(),
    listApplicationsOfUser: jest.fn(),
  },
}));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: {
    confirmPilotStep: jest.fn(),
    revokePilotStep: jest.fn(),
    setPilotStep: jest.fn(),
  },
}));
jest.mock("@/features/training", () => ({
  exemptionInput: jest.requireActual("@/features/training/schemas")
    .exemptionInput,
  training: {
    grantExemption: jest.fn(async () => ({ created: true })),
    revokeExemption: jest.fn(async () => ({ revoked: true })),
  },
}));
jest.mock("@/lib/activity", () => ({ activity: { record: jest.fn() } }));

const adminOfA: Access = {
  role: null,
  countryAdminOf: [],
  memberships: [{ chapterId: "chapter-a", roles: ["admin"] }],
};

jest.mock("@/lib/auth-guards", () => ({
  requireAdminScope: jest.fn(),
  requireAdminOf: jest.fn(async (authority: AdminAuthority) => {
    if (!allowsAdmin(adminOfA, authority))
      throw new Error("NEXT_HTTP_ERROR_FALLBACK;403");
    return { user: { id: "admin-a" }, access: adminOfA };
  }),
}));

const memberships = membership.listMembershipsOfUser as jest.Mock;
const applications = membership.listApplicationsOfUser as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  memberships.mockResolvedValue([]);
  applications.mockResolvedValue([]);
});

describe("in-person training", () => {
  it("lets the admin of the pilot's chapter confirm it and records the history line there", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-b", roles: ["pilot"] },
      { chapterId: "chapter-a", roles: ["pilot"] },
    ]);

    await confirmInPersonTraining("pilot-1");

    expect(personProfiles.confirmPilotStep).toHaveBeenCalledWith(
      "pilot-1",
      "inPersonTraining",
      "admin-a",
    );
    expect(activity.record).toHaveBeenCalledWith({
      userId: "pilot-1",
      actorUserId: "admin-a",
      chapterId: "chapter-a",
      type: "inPersonTrainingConfirmed",
    });
  });

  it("refuses someone who is no pilot anywhere exactly like a pilot elsewhere", async () => {
    await expect(confirmInPersonTraining("stranger")).rejects.toThrow(
      FORBIDDEN,
    );

    memberships.mockResolvedValue([
      { chapterId: "chapter-b", roles: ["pilot"] },
    ]);
    await expect(revokeInPersonTraining("pilot-b")).rejects.toThrow(FORBIDDEN);

    expect(personProfiles.confirmPilotStep).not.toHaveBeenCalled();
    expect(personProfiles.revokePilotStep).not.toHaveBeenCalled();
  });

  it("does not let a named chapter widen the check to another of the pilot's chapters", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-a", roles: ["pilot"] },
      { chapterId: "chapter-b", roles: ["pilot"] },
    ]);
    await expect(
      confirmInPersonTraining("pilot-1", "chapter-b"),
    ).rejects.toThrow(FORBIDDEN);
    expect(personProfiles.confirmPilotStep).not.toHaveBeenCalled();
  });

  it("lets an applicant's chapter admin confirm too", async () => {
    applications.mockResolvedValue([
      { chapterId: "chapter-a", status: "pending" },
    ]);
    await revokeInPersonTraining("applicant-1", "chapter-a");
    expect(personProfiles.revokePilotStep).toHaveBeenCalledWith(
      "applicant-1",
      "inPersonTraining",
    );
  });
});

describe("exemptions", () => {
  it("grants a manual exemption scoped to the admin's chapter", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-a", roles: ["pilot"] },
    ]);
    await grantTrainingExemption({
      userId: "pilot-1",
      chapterId: "chapter-a",
      familyId: "family-1",
    });
    expect(training.grantExemption).toHaveBeenCalledWith(
      { userId: "pilot-1", familyId: "family-1", reason: "manual" },
      {
        grantedByUserId: "admin-a",
        chapterId: "chapter-a",
        visibleTo: { chapterId: "chapter-a", countryId: "country-dk" },
      },
    );
  });

  it("revokes a blanket exemption", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-a", roles: ["pilot"] },
    ]);
    await revokeTrainingExemption({
      userId: "pilot-1",
      chapterId: "chapter-a",
      familyId: null,
    });
    expect(training.revokeExemption).toHaveBeenCalledWith(
      { userId: "pilot-1", familyId: null },
      { actorUserId: "admin-a", chapterId: "chapter-a" },
    );
  });

  it("refuses an admin of another chapter", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-b", roles: ["pilot"] },
    ]);
    await expect(
      grantTrainingExemption({
        userId: "pilot-b",
        chapterId: "chapter-b",
        familyId: null,
      }),
    ).rejects.toThrow(FORBIDDEN);
    expect(training.grantExemption).not.toHaveBeenCalled();
  });

  it("finds the admin's own chapter when none is named", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-b", roles: ["pilot"] },
      { chapterId: "chapter-a", roles: ["pilot"] },
    ]);
    await grantTrainingExemption({ userId: "pilot-1", familyId: null });
    expect(training.grantExemption).toHaveBeenCalledWith(
      { userId: "pilot-1", familyId: null, reason: "manual" },
      {
        grantedByUserId: "admin-a",
        chapterId: "chapter-a",
        visibleTo: { chapterId: "chapter-a", countryId: "country-dk" },
      },
    );
  });

  it("refuses without a named chapter when the pilot trains only elsewhere", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-b", roles: ["pilot"] },
    ]);
    await expect(
      revokeTrainingExemption({ userId: "pilot-b", familyId: null }),
    ).rejects.toThrow(FORBIDDEN);
    expect(training.revokeExemption).not.toHaveBeenCalled();
  });

  it("refuses a pilot who isn't in the named chapter", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-b", roles: ["pilot"] },
    ]);
    await expect(
      grantTrainingExemption({
        userId: "pilot-b",
        chapterId: "chapter-a",
        familyId: null,
      }),
    ).rejects.toThrow(FORBIDDEN);
  });
});

it("sends a pilot without any admin scope away before reading anything", async () => {
  (requireAdminScope as unknown as jest.Mock).mockRejectedValueOnce(
    new Error("NEXT_REDIRECT"),
  );
  await expect(
    grantTrainingExemption({
      userId: "pilot-1",
      chapterId: "chapter-a",
      familyId: null,
    }),
  ).rejects.toThrow("NEXT_REDIRECT");
  expect(memberships).not.toHaveBeenCalled();
  expect(training.grantExemption).not.toHaveBeenCalled();
});
