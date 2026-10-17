import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { personProfiles } from "@/features/person-profiles";
import { training, type FamilyStatusName } from "@/features/training";
import { domainCode, DomainError } from "@/lib/domain-error";
import {
  requirementImpact,
  setTrainingRequirement,
} from "./training-requirements";

jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapterCountryId: jest.fn(async () => "country-de"),
    listChapters: jest.fn(),
    listChapterScopes: jest.fn(),
  },
}));
jest.mock("@/features/membership", () => ({
  membership: { listPilotMembers: jest.fn() },
}));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: { inPersonTrainingOf: jest.fn() },
}));
jest.mock("@/features/training", () => ({
  ...jest.requireActual("@/features/training/requirements"),
  requirementInput: jest.requireActual("@/features/training/schemas")
    .requirementInput,
  training: {
    readinessFacts: jest.fn(),
    assertFamilyAllowed: jest.fn(),
    setRequirement: jest.fn(async () => ({ id: "req-1" })),
  },
}));
jest.mock("./training-access", () => ({ trainingContext: jest.fn() }));

const status = (familyId: string, name: FamilyStatusName) => ({
  familyId,
  title: familyId,
  status: name,
});

beforeEach(() => {
  jest.clearAllMocks();
  (chapters.listChapters as jest.Mock).mockResolvedValue([
    { id: "chapter-berlin", countryId: "country-de" },
    { id: "chapter-munich", countryId: "country-de" },
  ]);
  (membership.listPilotMembers as jest.Mock).mockResolvedValue([
    { userId: "ready-untrained", chapterId: "chapter-berlin" },
    { userId: "ready-passed", chapterId: "chapter-berlin" },
    { userId: "not-ready", chapterId: "chapter-berlin" },
    { userId: "munich-ready", chapterId: "chapter-munich" },
  ]);
  (personProfiles.inPersonTrainingOf as jest.Mock).mockResolvedValue(
    new Map(
      ["ready-untrained", "ready-passed", "not-ready", "munich-ready"].map(
        (userId) => [
          userId,
          {
            confirmedAt: new Date(),
            confirmedByUserId: null,
          },
        ],
      ),
    ),
  );
  (training.readinessFacts as jest.Mock).mockResolvedValue({
    families: new Map(),
    requirements: new Map([
      ["chapter-berlin", [{ familyId: "basics" }]],
      ["chapter-munich", [{ familyId: "basics" }, { familyId: "new" }]],
    ]),
    statuses: new Map([
      [
        "chapter-berlin",
        new Map([
          [
            "ready-untrained",
            [status("basics", "exempt"), status("new", "notStarted")],
          ],
          [
            "ready-passed",
            [status("basics", "passed"), status("new", "passed")],
          ],
          [
            "not-ready",
            [status("basics", "inProgress"), status("new", "notStarted")],
          ],
        ]),
      ],
      [
        "chapter-munich",
        new Map([
          [
            "munich-ready",
            [status("basics", "passed"), status("new", "exempt")],
          ],
        ]),
      ],
    ]),
    exemptions: new Map(),
  });
});

describe("requirementImpact", () => {
  const owner = { scope: "country" as const, countryId: "country-de" };

  it("counts only pilots who are ready today and would not be", async () => {
    await expect(
      requirementImpact({ owner, familyId: "new" }),
    ).resolves.toEqual({ pilots: 1 });
    expect(training.readinessFacts).toHaveBeenCalledWith(
      [
        {
          chapter: { chapterId: "chapter-berlin", countryId: "country-de" },
          userIds: ["ready-untrained", "ready-passed", "not-ready"],
        },
        {
          chapter: { chapterId: "chapter-munich", countryId: "country-de" },
          userIds: ["munich-ready"],
        },
      ],
      { extraFamilyIds: ["new"] },
    );
  });

  it("stops at a family the owner may not require", async () => {
    (training.assertFamilyAllowed as jest.Mock).mockRejectedValueOnce(
      new DomainError("familyNotAllowed"),
    );
    expect(
      domainCode(
        await requirementImpact({ owner, familyId: "new" }).catch((e) => e),
      ),
    ).toBe("familyNotAllowed");
    expect(training.readinessFacts).not.toHaveBeenCalled();
  });

  it("is zero when the scope has no pilots", async () => {
    (membership.listPilotMembers as jest.Mock).mockResolvedValue([]);
    await expect(
      requirementImpact({
        owner: { scope: "chapter", chapterId: "chapter-berlin" },
        familyId: "new",
      }),
    ).resolves.toEqual({ pilots: 0 });
  });
});

describe("setTrainingRequirement", () => {
  it("hands a chapter requirement its chapter's country", async () => {
    await setTrainingRequirement(
      {
        owner: { scope: "chapter", chapterId: "chapter-berlin" },
        familyId: "f",
      },
      "admin-1",
    );
    expect(training.setRequirement).toHaveBeenCalledWith(
      {
        owner: { scope: "chapter", chapterId: "chapter-berlin" },
        familyId: "f",
      },
      "admin-1",
      { chapterId: "chapter-berlin", countryId: "country-de" },
    );
  });

  it("needs no chapter for a global requirement", async () => {
    await setTrainingRequirement(
      { owner: { scope: "global" }, familyId: "f" },
      "admin-1",
    );
    expect(training.setRequirement).toHaveBeenCalledWith(
      { owner: { scope: "global" }, familyId: "f" },
      "admin-1",
      null,
    );
  });
});
