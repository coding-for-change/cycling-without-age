import { accounts } from "@/features/accounts";
import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { personProfiles } from "@/features/person-profiles";
import { training } from "@/features/training";
import type { Access } from "@/lib/access";
import {
  courseProgress,
  memberTrainingPanel,
  trainingProgressTable,
} from "./training-progress";
import { trainingContext } from "./training-access";

jest.mock("@/features/accounts", () => ({
  accounts: { displayNames: jest.fn() },
}));
jest.mock("@/features/chapters", () => ({
  chapters: { getChapterCountryIds: jest.fn(), getChapterCountryId: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listPilotMembers: jest.fn() },
}));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: { inPersonTrainingOf: jest.fn() },
}));
jest.mock("@/features/training", () => ({
  ...jest.requireActual("@/features/training/requirements"),
  training: {
    readinessFacts: jest.fn(),
    familyTitles: jest.fn(),
    courseFamilyOf: jest.fn(async () => ({ familyId: "basics" })),
  },
}));
jest.mock("./training-access", () => ({ trainingContext: jest.fn() }));

const BASICS = {
  familyId: "basics",
  title: "Basics",
  language: "en",
  variants: [{ courseId: "basics-en", language: "en", title: "Basics" }],
};

const course = (status: string, extra: object = {}) => ({
  familyId: "basics",
  title: "Basics",
  status,
  percent: status === "passed" ? 100 : 40,
  passedAt: null,
  startedAt: null,
  lastActivityAt: null,
  attempts: 2,
  currentLessonTitle: "Braking",
  variantCourseId: "basics-en",
  exemption: null,
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  (chapters.getChapterCountryIds as jest.Mock).mockResolvedValue(
    new Map([["chapter-berlin", "country-de"]]),
  );
  (membership.listPilotMembers as jest.Mock).mockResolvedValue([
    { userId: "pilot-a", chapterId: "chapter-berlin" },
    { userId: "pilot-b", chapterId: "chapter-berlin" },
  ]);
  (accounts.displayNames as jest.Mock).mockResolvedValue({
    "pilot-a": "Anna",
    "pilot-b": "Bo",
    "admin-1": "Admin One",
  });
  (personProfiles.inPersonTrainingOf as jest.Mock).mockResolvedValue(
    new Map([
      [
        "pilot-a",
        {
          confirmedAt: new Date("2026-10-10"),
          confirmedByUserId: "admin-1",
        },
      ],
    ]),
  );
  (training.readinessFacts as jest.Mock).mockResolvedValue({
    families: new Map([["basics", BASICS]]),
    requirements: new Map([["chapter-berlin", [{ familyId: "basics" }]]]),
    statuses: new Map([
      [
        "chapter-berlin",
        new Map([
          ["pilot-a", [course("passed")]],
          ["pilot-b", [course("inProgress")]],
        ]),
      ],
    ]),
    exemptions: new Map([
      [
        "pilot-a",
        [
          {
            id: "ex-1",
            userId: "pilot-a",
            familyKey: "all",
            familyId: null,
            reason: "experienced",
            grantedByUserId: "admin-1",
            chapterId: "chapter-berlin",
            grantedAt: new Date("2026-10-01"),
          },
          {
            id: "ex-2",
            userId: "pilot-a",
            familyKey: "basics",
            familyId: "basics",
            reason: "migration",
            grantedByUserId: null,
            chapterId: null,
            grantedAt: new Date("2026-10-01"),
          },
        ],
      ],
    ]),
  });
  (training.familyTitles as jest.Mock).mockResolvedValue(
    new Map([["basics", "Basics"]]),
  );
});

describe("trainingProgressTable", () => {
  it("gives one row per pilot and required course, with names at chapter scope", async () => {
    const table = await trainingProgressTable({
      chapterIds: ["chapter-berlin"],
      includeNames: true,
    });
    expect(table.families).toEqual([BASICS]);
    expect(table.pilots).toEqual([
      {
        userId: "pilot-a",
        chapterId: "chapter-berlin",
        name: "Anna",
        ready: true,
        coursesDone: true,
        inPersonConfirmedAt: new Date("2026-10-10"),
      },
      expect.objectContaining({ userId: "pilot-b", ready: false }),
    ]);
    expect(
      table.rows.map((row) => [row.pilotName, row.familyId, row.status]),
    ).toEqual([
      ["Anna", "basics", "passed"],
      ["Bo", "basics", "inProgress"],
    ]);
  });

  it("names nobody above chapter scope", async () => {
    const table = await trainingProgressTable({
      chapterIds: ["chapter-berlin"],
      includeNames: false,
    });
    expect(accounts.displayNames).not.toHaveBeenCalled();
    expect(table.pilots.every((pilot) => pilot.name === null)).toBe(true);
    expect(table.rows.every((row) => row.pilotName === null)).toBe(true);
    expect(table.pilots.every((pilot) => pilot.userId === null)).toBe(true);
    expect(table.rows.every((row) => row.userId === null)).toBe(true);
    expect(JSON.stringify(table)).not.toMatch(/pilot-a|pilot-b/);
  });

  it("is empty without chapters", async () => {
    await expect(
      trainingProgressTable({ chapterIds: [], includeNames: true }),
    ).resolves.toEqual({ families: [], pilots: [], rows: [] });
  });
});

describe("memberTrainingPanel", () => {
  const berlinAdmin: Access = {
    role: null,
    countryAdminOf: [],
    memberships: [{ chapterId: "chapter-berlin", roles: ["admin"] }],
  };

  beforeEach(() => {
    (trainingContext as jest.Mock).mockResolvedValue([
      { chapterId: "chapter-berlin", countryId: "country-de", status: "pilot" },
      { chapterId: "chapter-aarhus", countryId: "country-dk", status: "pilot" },
    ]);
  });

  it("shows only the chapters the viewer administers, with granters named", async () => {
    const panel = await memberTrainingPanel("pilot-a", berlinAdmin, "en");
    expect(training.readinessFacts).toHaveBeenCalledWith(
      [
        {
          chapter: { chapterId: "chapter-berlin", countryId: "country-de" },
          userIds: ["pilot-a"],
        },
      ],
      { locale: "en" },
    );
    expect(panel?.chapters.map((c) => [c.chapterId, c.ready])).toEqual([
      ["chapter-berlin", true],
    ]);
    expect(panel?.inPerson).toEqual({
      confirmedAt: new Date("2026-10-10"),
      confirmedBy: { userId: "admin-1", name: "Admin One" },
    });
    expect(panel?.blanketExemption).toMatchObject({
      reason: "experienced",
      grantedBy: { userId: "admin-1", name: "Admin One" },
    });
    expect(panel?.exemptions[1]).toMatchObject({
      familyId: "basics",
      familyTitle: "Basics",
      reason: "migration",
      grantedBy: null,
    });
  });

  it("is null for a viewer who administers none of the person's chapters", async () => {
    const panel = await memberTrainingPanel("pilot-a", {
      role: null,
      countryAdminOf: [],
      memberships: [{ chapterId: "chapter-munich", roles: ["admin"] }],
    });
    expect(panel).toBeNull();
    expect(training.readinessFacts).not.toHaveBeenCalled();
  });
});

describe("courseProgress", () => {
  it("names the pilots at chapter scope", async () => {
    const result = await courseProgress({
      courseId: "basics-en",
      chapterIds: ["chapter-berlin"],
      includeNames: true,
      locale: "en",
    });
    expect(training.readinessFacts).toHaveBeenCalledWith(
      [
        {
          chapter: { chapterId: "chapter-berlin", countryId: "country-de" },
          userIds: ["pilot-a", "pilot-b"],
        },
      ],
      { locale: "en", extraFamilyIds: ["basics"] },
    );
    expect(result).toMatchObject({
      familyId: "basics",
      pilots: 2,
      counts: { passed: 1, inProgress: 1, exempt: 0, notStarted: 0 },
    });
    expect(result.rows).toEqual([
      expect.objectContaining({
        userId: "pilot-a",
        name: "Anna",
        required: true,
        status: "passed",
        percent: 100,
      }),
      expect.objectContaining({
        userId: "pilot-b",
        name: "Bo",
        status: "inProgress",
        currentLessonTitle: "Braking",
        attempts: 2,
      }),
    ]);
  });

  it("only counts at country or global scope", async () => {
    const result = await courseProgress({
      courseId: "basics-en",
      chapterIds: ["chapter-berlin"],
      includeNames: false,
    });
    expect(result.rows).toEqual([]);
    expect(result.counts).toEqual({
      passed: 1,
      inProgress: 1,
      exempt: 0,
      notStarted: 0,
    });
    expect(accounts.displayNames).not.toHaveBeenCalled();
  });

  it("is empty without chapters or pilots", async () => {
    await expect(
      courseProgress({
        courseId: "basics-en",
        chapterIds: [],
        includeNames: true,
      }),
    ).resolves.toMatchObject({ pilots: 0, rows: [] });
    (membership.listPilotMembers as jest.Mock).mockResolvedValue([]);
    await expect(
      courseProgress({
        courseId: "basics-en",
        chapterIds: ["chapter-berlin"],
        includeNames: true,
      }),
    ).resolves.toMatchObject({ pilots: 0, rows: [] });
    expect(training.readinessFacts).not.toHaveBeenCalled();
  });
});
