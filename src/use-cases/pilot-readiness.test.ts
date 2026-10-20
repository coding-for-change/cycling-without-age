import { chapters } from "@/features/chapters";
import { personProfiles } from "@/features/person-profiles";
import { training, type PilotFamilyStatus } from "@/features/training";
import { domainCode } from "@/lib/domain-error";
import {
  assertPilotsReady,
  ownReadiness,
  pilotReadiness,
  readinessForChapters,
  readinessOfPilots,
} from "./pilot-readiness";
import { trainingContext } from "./training-access";

jest.mock("@/features/chapters", () => ({
  chapters: {
    getChapterCountryId: jest.fn(async () => "country-de"),
    getChapterCountryIds: jest.fn(),
  },
}));
jest.mock("@/features/person-profiles", () => ({
  personProfiles: { inPersonTrainingOf: jest.fn() },
}));
jest.mock("@/features/training", () => ({
  ...jest.requireActual("@/features/training/requirements"),
  training: { readinessFacts: jest.fn() },
}));
jest.mock("./training-access", () => ({ trainingContext: jest.fn() }));

const CHAPTER = "chapter-berlin";

const status = (
  familyId: string,
  name: PilotFamilyStatus["status"],
  exemption: Partial<NonNullable<PilotFamilyStatus["exemption"]>> | null = null,
): PilotFamilyStatus => ({
  familyId,
  title: `Course ${familyId}`,
  status: name,
  percent: name === "passed" ? 100 : 0,
  passedAt: name === "passed" ? new Date("2026-10-02") : null,
  startedAt: null,
  lastActivityAt: null,
  attempts: name === "passed" ? 1 : 0,
  currentLessonTitle: null,
  variantCourseId: `${familyId}-en`,
  exemption: exemption
    ? {
        id: "ex",
        userId: "u",
        familyKey: "all",
        familyId: null,
        reason: "migration",
        grantedByUserId: null,
        chapterId: null,
        grantedAt: new Date("2026-10-16"),
        ...exemption,
      }
    : null,
});

const facts = (
  byUser: Record<string, PilotFamilyStatus[]>,
  chapterId = CHAPTER,
) => ({
  families: new Map(),
  requirements: new Map([
    [
      chapterId,
      [
        ...new Set(
          Object.values(byUser)
            .flat()
            .map((s) => s.familyId),
        ),
      ].map((familyId) => ({ familyId })),
    ],
  ]),
  statuses: new Map([[chapterId, new Map(Object.entries(byUser))]]),
  exemptions: new Map(),
});

const confirmed = (userIds: string[]) =>
  new Map(
    userIds.map((userId) => [
      userId,
      {
        confirmedAt: new Date("2026-10-10"),
        confirmedByUserId: "admin-1",
      },
    ]),
  );

const readinessFacts = training.readinessFacts as jest.Mock;
const inPersonTrainingOf = personProfiles.inPersonTrainingOf as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  inPersonTrainingOf.mockResolvedValue(new Map());
});

describe("assertPilotsReady", () => {
  it("lets a pilot through who passed everything and was confirmed in person", async () => {
    readinessFacts.mockResolvedValue(
      facts({ "pilot-a": [status("basics", "passed")] }),
    );
    inPersonTrainingOf.mockResolvedValue(confirmed(["pilot-a"]));
    await expect(assertPilotsReady(["pilot-a"], CHAPTER)).resolves.toBe(
      undefined,
    );
    expect(readinessFacts).toHaveBeenCalledWith(
      [
        {
          chapter: { chapterId: CHAPTER, countryId: "country-de" },
          userIds: ["pilot-a"],
        },
      ],
      { locale: undefined },
    );
  });

  it("lets an exempt pilot through", async () => {
    readinessFacts.mockResolvedValue(
      facts({ "pilot-a": [status("basics", "exempt", {})] }),
    );
    inPersonTrainingOf.mockResolvedValue(confirmed(["pilot-a"]));
    await expect(assertPilotsReady(["pilot-a"], CHAPTER)).resolves.toBe(
      undefined,
    );
  });

  it("blocks a pilot with a required course still open", async () => {
    readinessFacts.mockResolvedValue(
      facts({
        "pilot-a": [status("basics", "passed")],
        "pilot-b": [status("basics", "inProgress")],
      }),
    );
    inPersonTrainingOf.mockResolvedValue(confirmed(["pilot-a", "pilot-b"]));
    expect(
      domainCode(
        await assertPilotsReady(["pilot-a", "pilot-b"], CHAPTER).catch(
          (error) => error,
        ),
      ),
    ).toBe("pilotNotReady");
  });

  it("blocks a pilot whose in-person training isn't confirmed", async () => {
    readinessFacts.mockResolvedValue(
      facts({ "pilot-a": [status("basics", "passed")] }),
    );
    inPersonTrainingOf.mockResolvedValue(
      new Map([["pilot-a", { confirmedAt: null, confirmedByUserId: null }]]),
    );
    expect(
      domainCode(
        await assertPilotsReady(["pilot-a"], CHAPTER).catch((error) => error),
      ),
    ).toBe("pilotNotReady");
  });

  it("does nothing for an empty crew", async () => {
    await assertPilotsReady([], CHAPTER);
    expect(readinessFacts).not.toHaveBeenCalled();
  });

  it("reads a chapter without a country through global and chapter requirements", async () => {
    (chapters.getChapterCountryId as jest.Mock).mockResolvedValueOnce(null);
    readinessFacts.mockResolvedValue(
      facts({ "pilot-a": [status("basics", "inProgress")] }),
    );
    expect(
      domainCode(
        await assertPilotsReady(["pilot-a"], CHAPTER).catch((error) => error),
      ),
    ).toBe("pilotNotReady");
    expect(readinessFacts).toHaveBeenCalledWith(
      [
        {
          chapter: { chapterId: CHAPTER, countryId: null },
          userIds: ["pilot-a"],
        },
      ],
      { locale: undefined },
    );
  });
});

describe("with TRAINING_REQUIRED off", () => {
  beforeEach(() => {
    process.env.TRAINING_REQUIRED = "false";
  });
  afterEach(() => {
    process.env.TRAINING_REQUIRED = "true";
  });

  it("lets a pilot through without evaluating any requirement", async () => {
    await expect(assertPilotsReady(["pilot-a"], CHAPTER)).resolves.toBe(
      undefined,
    );
    expect(readinessFacts).not.toHaveBeenCalled();
    expect(inPersonTrainingOf).not.toHaveBeenCalled();
  });

  it("reports every pilot ready", async () => {
    const readiness = await readinessOfPilots(["pilot-a", "pilot-b"], CHAPTER);
    expect([...readiness.values()].map((r) => [r.userId, r.ready])).toEqual([
      ["pilot-a", true],
      ["pilot-b", true],
    ]);
    expect((await pilotReadiness("pilot-a", CHAPTER)).courses).toEqual([]);
    expect(readinessFacts).not.toHaveBeenCalled();
  });

  it("reports every pilot ready across chapters", async () => {
    const byChapter = await readinessForChapters([
      { chapterId: CHAPTER, userIds: ["pilot-a"] },
      { chapterId: "chapter-hamburg", userIds: ["pilot-b"] },
    ]);
    expect(byChapter.get(CHAPTER)?.get("pilot-a")?.ready).toBe(true);
    expect(byChapter.get("chapter-hamburg")?.get("pilot-b")?.ready).toBe(true);
    expect(chapters.getChapterCountryIds).not.toHaveBeenCalled();
  });

  it("treats anything but the exact string true as off", async () => {
    process.env.TRAINING_REQUIRED = "TRUE";
    await expect(assertPilotsReady(["pilot-a"], CHAPTER)).resolves.toBe(
      undefined,
    );
    delete process.env.TRAINING_REQUIRED;
    await expect(assertPilotsReady(["pilot-a"], CHAPTER)).resolves.toBe(
      undefined,
    );
    expect(readinessFacts).not.toHaveBeenCalled();
  });
});

describe("pilotReadiness", () => {
  it("lists every required course with its state and the in-person tick", async () => {
    readinessFacts.mockResolvedValue(
      facts({
        "pilot-a": [
          status("basics", "passed"),
          status("traffic", "exempt", { familyKey: "traffic" }),
        ],
      }),
    );
    inPersonTrainingOf.mockResolvedValue(confirmed(["pilot-a"]));
    const readiness = await pilotReadiness("pilot-a", CHAPTER, "de");
    expect(readiness).toMatchObject({
      userId: "pilot-a",
      chapterId: CHAPTER,
      ready: true,
      coursesDone: true,
      inPerson: {
        confirmedAt: new Date("2026-10-10"),
        confirmedBy: "admin-1",
      },
    });
    expect(readiness.courses).toEqual([
      expect.objectContaining({
        familyId: "basics",
        name: "Course basics",
        status: "passed",
        attempts: 1,
        exemption: null,
      }),
      expect.objectContaining({
        familyId: "traffic",
        status: "exempt",
        exemption: expect.objectContaining({
          blanket: false,
          reason: "migration",
        }),
      }),
    ]);
  });

  it("is ready without courses when nothing is required, once confirmed in person", async () => {
    readinessFacts.mockResolvedValue(facts({ "pilot-a": [] }));
    inPersonTrainingOf.mockResolvedValue(confirmed(["pilot-a"]));
    const map = await readinessOfPilots(["pilot-a", "pilot-a"], CHAPTER);
    expect(map.get("pilot-a")).toMatchObject({ ready: true, courses: [] });
  });
});

describe("ownReadiness", () => {
  it("reads every chapter the person trains for and is done only when all are", async () => {
    (trainingContext as jest.Mock).mockResolvedValue([
      { chapterId: "chapter-a", countryId: "country-de", status: "pilot" },
      { chapterId: "chapter-b", countryId: "country-de", status: "applicant" },
    ]);
    readinessFacts.mockResolvedValue({
      families: new Map(),
      requirements: new Map([
        ["chapter-a", [{ familyId: "basics" }]],
        ["chapter-b", [{ familyId: "basics" }, { familyId: "hills" }]],
      ]),
      statuses: new Map([
        ["chapter-a", new Map([["me", [status("basics", "passed")]]])],
        [
          "chapter-b",
          new Map([
            ["me", [status("basics", "passed"), status("hills", "notStarted")]],
          ]),
        ],
      ]),
      exemptions: new Map(),
    });
    const own = await ownReadiness("me", "en");
    expect(own.coursesDone).toBe(false);
    expect(
      own.chapters.map((c) => [c.chapterId, c.status, c.coursesDone]),
    ).toEqual([
      ["chapter-a", "pilot", true],
      ["chapter-b", "applicant", false],
    ]);
    expect(own.inPerson).toEqual({
      confirmedAt: null,
      confirmedBy: null,
    });
  });
});
