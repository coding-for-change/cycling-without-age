import { membership } from "@/features/membership";
import { personProfiles } from "@/features/person-profiles";
import { confirmPilotStep, revokePilotStep } from "./pilot-steps";

const FORBIDDEN = "NEXT_HTTP_ERROR_FALLBACK;403";

jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapterCountryId: jest.fn(async () => "country-dk"),
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
jest.mock("@/lib/auth-guards", () => ({
  requireAdminScope: jest.fn(),
  requireAdminOf: jest.fn(
    async (authority: { chapters: { chapterId: string }[] }) => {
      if (!authority.chapters.some((c) => c.chapterId === "chapter-a"))
        throw new Error("NEXT_HTTP_ERROR_FALLBACK;403");
      return { user: { id: "admin-a" } };
    },
  ),
}));

const memberships = membership.listMembershipsOfUser as jest.Mock;
const applications = membership.listApplicationsOfUser as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  memberships.mockResolvedValue([]);
  applications.mockResolvedValue([]);
});

describe("confirmPilotStep", () => {
  it("lets the admin of the pilot's chapter confirm a step", async () => {
    memberships.mockResolvedValue([
      { chapterId: "chapter-a", roles: ["pilot"] },
    ]);

    await confirmPilotStep("pilot-1", "workshop");

    expect(personProfiles.confirmPilotStep).toHaveBeenCalledWith(
      "pilot-1",
      "workshop",
      "admin-a",
    );
  });

  it("refuses someone who is no pilot anywhere exactly like a pilot elsewhere", async () => {
    await expect(confirmPilotStep("stranger", "workshop")).rejects.toThrow(
      FORBIDDEN,
    );

    memberships.mockResolvedValue([
      { chapterId: "chapter-b", roles: ["pilot"] },
    ]);
    await expect(revokePilotStep("pilot-b", "workshop")).rejects.toThrow(
      FORBIDDEN,
    );

    expect(personProfiles.confirmPilotStep).not.toHaveBeenCalled();
    expect(personProfiles.revokePilotStep).not.toHaveBeenCalled();
  });
});
