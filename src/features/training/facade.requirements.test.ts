import { training } from "@/features/training";
import { domainCode } from "@/lib/domain-error";
import * as courses from "./services/courses";
import * as exemptions from "./services/exemptions";
import * as families from "./services/families";
import * as lessons from "./services/lessons";
import * as progress from "./services/progress";
import * as requirements from "./services/requirements";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const emitted: unknown[] = [];
jest.mock("@/lib/events", () => ({
  transaction: jest.fn((run: (tx: unknown, emit: unknown) => unknown) =>
    run({}, async (event: unknown) => {
      emitted.push(event);
    }),
  ),
}));

jest.mock("./services/videos");
jest.mock("./services/storage");
jest.mock("./services/families");
jest.mock("./services/courses");
jest.mock("./services/lessons");
jest.mock("./services/progress");
jest.mock("./services/quiz");
jest.mock("./services/requirements");
jest.mock("./services/exemptions");

const mocked = (fn: unknown) => fn as jest.Mock;

const code = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return domainCode(error);
  }
  return null;
};

const BERLIN = { chapterId: "chapter-berlin", countryId: "country-de" };

const family = (scope: string, owner: string | null = null) => ({
  id: `family-${scope}`,
  scope,
  scopeKey: owner ? `${scope}:${owner}` : "global",
  countryId: scope === "country" ? owner : null,
  chapterId: scope === "chapter" ? owner : null,
  country: null,
  chapter: scope === "chapter" ? { countryId: "country-de" } : null,
});

const requirementRow = (
  familyId: string,
  scope: "global" | "country" | "chapter",
  owner: string | null = null,
) => ({
  id: `req-${familyId}-${scope}`,
  familyId,
  scope,
  scopeKey: owner ? `${scope}:${owner}` : "global",
  countryId: scope === "country" ? owner : null,
  chapterId: scope === "chapter" ? owner : null,
  createdByUserId: "admin-1",
  createdAt: new Date("2026-10-01"),
  chapter: scope === "chapter" ? { countryId: "country-de" } : null,
});

beforeEach(() => {
  jest.clearAllMocks();
  emitted.length = 0;
});

describe("setRequirement", () => {
  it("lets a country require a global or its own family, never another country's", async () => {
    mocked(families.findFamilyById).mockResolvedValue(
      family("country", "country-dk"),
    );
    expect(
      await code(() =>
        training.setRequirement(
          {
            owner: { scope: "country", countryId: "country-de" },
            familyId: "family-country",
          },
          "admin-1",
        ),
      ),
    ).toBe("familyNotAllowed");

    mocked(families.findFamilyById).mockResolvedValue(family("global"));
    mocked(requirements.upsertRequirement).mockResolvedValue(
      requirementRow("family-global", "country", "country-de"),
    );
    await training.setRequirement(
      {
        owner: { scope: "country", countryId: "country-de" },
        familyId: "family-global",
      },
      "admin-1",
    );
    expect(requirements.upsertRequirement).toHaveBeenCalledWith({
      scope: "country",
      scopeKey: "country:country-de",
      countryId: "country-de",
      chapterId: null,
      familyId: "family-global",
      createdByUserId: "admin-1",
    });
  });

  it("only lets global require global families", async () => {
    mocked(families.findFamilyById).mockResolvedValue(
      family("country", "country-de"),
    );
    expect(
      await code(() =>
        training.setRequirement(
          { owner: { scope: "global" }, familyId: "family-country" },
          "admin-1",
        ),
      ),
    ).toBe("familyNotAllowed");
  });

  it("lets a chapter require what it sees, given its own context", async () => {
    mocked(families.findFamilyById).mockResolvedValue(
      family("chapter", "chapter-munich"),
    );
    const owner = { scope: "chapter" as const, chapterId: "chapter-berlin" };
    expect(
      await code(() =>
        training.setRequirement(
          { owner, familyId: "family-chapter" },
          "admin-1",
          BERLIN,
        ),
      ),
    ).toBe("familyNotAllowed");

    mocked(families.findFamilyById).mockResolvedValue(
      family("country", "country-de"),
    );
    expect(
      await code(() =>
        training.setRequirement({ owner, familyId: "family-country" }, "a"),
      ),
    ).toBe("familyNotAllowed");
  });
});

describe("requirementAuthority", () => {
  it("is nobody but a superadmin for a global requirement, the chapter for a chapter one", async () => {
    mocked(requirements.findRequirementById).mockResolvedValue(
      requirementRow("f", "global"),
    );
    expect(await training.requirementAuthority("r")).toEqual({
      chapters: [],
      countryIds: [],
    });
    mocked(requirements.findRequirementById).mockResolvedValue(
      requirementRow("f", "chapter", "chapter-berlin"),
    );
    expect(await training.requirementAuthority("r")).toEqual({
      chapters: [{ chapterId: "chapter-berlin", countryId: "country-de" }],
      countryIds: [],
    });
    mocked(requirements.findRequirementById).mockResolvedValue(null);
    expect(await code(() => training.requirementAuthority("r"))).toBe(
      "unknownTrainingRequirement",
    );
  });
});

describe("exemptions", () => {
  const row = {
    id: "ex-1",
    userId: "pilot-1",
    familyKey: "all",
    familyId: null,
    reason: "manual",
    grantedByUserId: "admin-1",
    chapterId: "chapter-berlin",
    grantedAt: new Date(),
  };

  it("grants once and emits once", async () => {
    mocked(exemptions.findExemption).mockResolvedValueOnce(null);
    mocked(exemptions.insertExemption).mockResolvedValue(row);
    const first = await training.grantExemption(
      { userId: "pilot-1", familyId: null, reason: "manual" },
      { grantedByUserId: "admin-1", chapterId: "chapter-berlin" },
    );
    expect(first.created).toBe(true);
    expect(exemptions.insertExemption).toHaveBeenCalledWith(
      {
        userId: "pilot-1",
        familyKey: "all",
        familyId: null,
        reason: "manual",
        grantedByUserId: "admin-1",
        chapterId: "chapter-berlin",
      },
      {},
    );
    expect(emitted).toEqual([
      {
        type: "training.exemptionGranted",
        userId: "pilot-1",
        familyId: null,
        reason: "manual",
        chapterId: "chapter-berlin",
        actorUserId: "admin-1",
      },
    ]);

    mocked(exemptions.findExemption).mockResolvedValueOnce(row);
    const again = await training.grantExemption(
      { userId: "pilot-1", familyId: null, reason: "manual" },
      { grantedByUserId: "admin-1", chapterId: "chapter-berlin" },
    );
    expect(again.created).toBe(false);
    expect(emitted).toHaveLength(1);
  });

  it("refuses a family the chapter can't see", async () => {
    mocked(families.findFamilyById).mockResolvedValue(
      family("country", "country-dk"),
    );
    expect(
      await code(() =>
        training.grantExemption(
          { userId: "pilot-1", familyId: "family-country", reason: "manual" },
          {
            grantedByUserId: "a",
            chapterId: "chapter-berlin",
            visibleTo: BERLIN,
          },
        ),
      ),
    ).toBe("familyNotAllowed");
    expect(exemptions.insertExemption).not.toHaveBeenCalled();
  });

  it("emits a revocation only when there was something to revoke", async () => {
    mocked(exemptions.deleteExemption).mockResolvedValueOnce({ count: 0 });
    expect(
      await training.revokeExemption(
        { userId: "pilot-1", familyId: "family-1" },
        { actorUserId: "admin-1", chapterId: "chapter-berlin" },
      ),
    ).toEqual({ revoked: false });
    expect(emitted).toHaveLength(0);

    mocked(exemptions.deleteExemption).mockResolvedValueOnce({ count: 1 });
    await training.revokeExemption(
      { userId: "pilot-1", familyId: "family-1" },
      { actorUserId: "admin-1", chapterId: "chapter-berlin" },
    );
    expect(exemptions.deleteExemption).toHaveBeenLastCalledWith(
      "pilot-1",
      "family-1",
      {},
    );
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "training.exemptionRevoked",
        familyId: "family-1",
      }),
    ]);
  });
});

describe("readinessFacts", () => {
  const published = (id: string, familyId: string, language: string) => ({
    id,
    familyId,
    language,
    title: `${familyId} ${language}`,
    summary: null,
    publishedAt: new Date(),
    family: family("global"),
  });

  beforeEach(() => {
    mocked(requirements.findRequirements).mockResolvedValue([
      requirementRow("basics", "global"),
      requirementRow("traffic", "country", "country-de"),
      requirementRow("draft-only", "chapter", "chapter-berlin"),
    ]);
    mocked(courses.findPublishedCoursesOfFamilies).mockResolvedValue([
      published("basics-en", "basics", "en"),
      published("basics-de", "basics", "de"),
      published("traffic-de", "traffic", "de"),
    ]);
    mocked(exemptions.findExemptions).mockResolvedValue([
      {
        id: "ex",
        userId: "pilot-b",
        familyKey: "traffic",
        familyId: "traffic",
        reason: "manual",
        grantedByUserId: "admin-1",
        chapterId: "chapter-berlin",
        grantedAt: new Date(),
      },
    ]);
    mocked(lessons.findLessonsOfCourses).mockResolvedValue(
      ["basics-en", "basics-de", "traffic-de"].flatMap((courseId) =>
        [0, 1].map((position) => ({
          id: `${courseId}-l${position}`,
          courseId,
          kind: position === 0 ? "lesson" : "quiz",
          position,
          title: `${courseId} element ${position}`,
          video: null,
          _count: { questions: position === 0 ? 0 : 2 },
        })),
      ),
    );
    mocked(progress.findEnrollmentsOfUsers).mockResolvedValue([
      {
        id: "en-1",
        userId: "pilot-a",
        courseId: "basics-de",
        startedAt: new Date("2026-10-01"),
        lastActivityAt: new Date("2026-10-02"),
        lastLessonId: null,
        passedAt: new Date("2026-10-02"),
        attemptCount: 1,
      },
      {
        id: "en-2",
        userId: "pilot-b",
        courseId: "basics-en",
        startedAt: new Date("2026-10-01"),
        lastActivityAt: new Date("2026-10-03"),
        lastLessonId: null,
        passedAt: null,
        attemptCount: 0,
      },
    ]);
    mocked(progress.findCompletionsOfUsers).mockResolvedValue([
      { userId: "pilot-b", lessonId: "basics-en-l0" },
    ]);
  });

  it("answers for a whole roster in a fixed number of queries", async () => {
    const facts = await training.readinessFacts(
      [
        {
          chapter: BERLIN,
          userIds: ["pilot-a", "pilot-b", "pilot-c", "pilot-d"],
        },
      ],
      { locale: "en" },
    );

    for (const query of [
      requirements.findRequirements,
      courses.findPublishedCoursesOfFamilies,
      exemptions.findExemptions,
      lessons.findLessonsOfCourses,
      progress.findEnrollmentsOfUsers,
      progress.findCompletionsOfUsers,
    ])
      expect(query).toHaveBeenCalledTimes(1);

    const of = (userId: string) =>
      facts.statuses
        .get("chapter-berlin")!
        .get(userId)!
        .map((status) => [status.familyId, status.status, status.percent]);

    expect(of("pilot-a")).toEqual([
      ["basics", "passed", 100],
      ["traffic", "notStarted", 0],
    ]);
    expect(of("pilot-b")).toEqual([
      ["basics", "inProgress", 50],
      ["traffic", "exempt", 0],
    ]);
    expect(
      facts.statuses
        .get("chapter-berlin")!
        .get("pilot-b")!
        .find((status) => status.familyId === "basics")?.currentLessonTitle,
    ).toBe("basics-en element 1");
    expect(facts.families.get("basics")?.title).toBe("basics en");
    expect(facts.families.has("draft-only")).toBe(false);
    expect(
      facts.requirements.get("chapter-berlin")!.map((r) => r.familyId),
    ).toEqual(["basics", "traffic", "draft-only"]);
  });

  it("adds a hypothetical family when asked", async () => {
    mocked(courses.findPublishedCoursesOfFamilies).mockResolvedValue([
      published("basics-en", "basics", "en"),
      published("extra-en", "extra", "en"),
    ]);
    const facts = await training.readinessFacts(
      [{ chapter: BERLIN, userIds: ["pilot-a"] }],
      { extraFamilyIds: ["extra"] },
    );
    expect(courses.findPublishedCoursesOfFamilies).toHaveBeenCalledWith(
      expect.arrayContaining(["basics", "traffic", "draft-only", "extra"]),
    );
    expect(
      facts.statuses
        .get("chapter-berlin")!
        .get("pilot-a")!
        .map((status) => status.familyId),
    ).toEqual(["basics", "extra"]);
  });
});

describe("removeRequirementOf", () => {
  it("deletes the requirement of exactly that owner", async () => {
    await training.removeRequirementOf({
      owner: { scope: "chapter", chapterId: "chapter-berlin" },
      familyId: "basics",
    });
    expect(requirements.deleteRequirementWhere).toHaveBeenCalledWith({
      scopeKey: "chapter:chapter-berlin",
      familyId: "basics",
    });
  });
});

describe("listCourseCatalogue", () => {
  const listed = (
    familyId: string,
    scope: "global" | "country" | "chapter",
    owner: string | null = null,
  ) => ({
    ...requirementRow(familyId, scope, owner),
    country: scope === "country" ? { name: "Germany" } : null,
    chapter:
      scope === "chapter" ? { name: "Berlin", countryId: "country-de" } : null,
    family: { id: familyId },
  });

  beforeEach(() => {
    mocked(families.findFamilies).mockResolvedValue([
      {
        ...family("global"),
        id: "basics",
        courses: [
          {
            id: "basics-en",
            language: "en",
            title: "Basics",
            summary: null,
            publishedAt: new Date(),
            updatedAt: new Date(),
            lessons: [{ kind: "lesson" }, { kind: "quiz" }, { kind: "lesson" }],
          },
          {
            id: "basics-de",
            language: "de",
            title: "Grundlagen",
            summary: null,
            publishedAt: null,
            updatedAt: new Date(),
            lessons: [],
          },
        ],
      },
      {
        ...family("country", "country-de"),
        id: "traffic",
        courses: [],
      },
    ]);
    mocked(requirements.findRequirementList).mockResolvedValue([
      listed("basics", "global"),
      listed("basics", "chapter", "chapter-berlin"),
      listed("traffic", "country", "country-de"),
      listed("traffic", "chapter", "chapter-hamburg"),
    ]);
  });

  it("marks where a course is required relative to the active chapter", async () => {
    const rows = await training.listCourseCatalogue(
      { countryIds: ["country-de"], chapterIds: ["chapter-berlin"] },
      {
        owner: { scope: "chapter", chapterId: "chapter-berlin" },
        countryId: "country-de",
      },
    );
    const basics = rows.find((row) => row.familyId === "basics")!;
    expect(basics).toMatchObject({
      published: true,
      required: true,
      requiredEffective: true,
      requirementId: "req-basics-chapter",
    });
    expect(basics.requiredIn.map((row) => row.relation)).toEqual([
      "inherited",
      "own",
    ]);
    expect(basics.variants[0]).toMatchObject({ lessons: 2, quizzes: 1 });
    expect(basics.variants[1]).toMatchObject({ published: false });

    const traffic = rows.find((row) => row.familyId === "traffic")!;
    expect(traffic).toMatchObject({
      required: false,
      requiredEffective: true,
      requirementId: null,
      published: false,
    });
    expect(traffic.requiredIn.map((row) => row.relation)).toEqual([
      "inherited",
      "other",
    ]);
  });

  it("treats the country admin's own country as own and chapters below as other", async () => {
    const rows = await training.listCourseCatalogue(
      { countryIds: ["country-de"], chapterIds: [] },
      {
        owner: { scope: "country", countryId: "country-de" },
        countryId: "country-de",
      },
    );
    const traffic = rows.find((row) => row.familyId === "traffic")!;
    expect(traffic.required).toBe(true);
    expect(traffic.requiredIn.map((row) => row.relation)).toEqual([
      "own",
      "other",
    ]);
    const basics = rows.find((row) => row.familyId === "basics")!;
    expect(basics).toMatchObject({ required: false, requiredEffective: true });
  });

  it("knows no relation without an active owner", async () => {
    const rows = await training.listCourseCatalogue(
      { countryIds: [], chapterIds: [] },
      null,
    );
    expect(rows[0]).toMatchObject({
      required: false,
      requiredEffective: false,
    });
  });
});
