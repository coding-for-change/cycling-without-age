import {
  BLANKET_EXEMPTION,
  effectiveRequirements,
  exemptionFor,
  familyStatus,
  pickVariant,
  readinessOf,
  type ExemptionFact,
  type RequirementSource,
  type VariantFacts,
} from "./requirements";

const variants = [{ language: "de" }, { language: "en" }, { language: "da" }];

describe("pickVariant", () => {
  it("takes the first preference that exists", () => {
    expect(pickVariant(variants, ["da", "de", "en"])).toEqual({
      language: "da",
    });
    expect(pickVariant(variants, ["sv", null, "en"])).toEqual({
      language: "en",
    });
  });

  it("matches a regional tag to its base language", () => {
    expect(pickVariant(variants, ["de-AT"])).toEqual({ language: "de" });
  });

  it("falls back to the first variant, or null when there is none", () => {
    expect(pickVariant(variants, ["ja"])).toEqual({ language: "de" });
    expect(pickVariant([], ["en"])).toBeNull();
  });
});

const BERLIN = { chapterId: "chapter-berlin", countryId: "country-de" };

const requirement = (
  familyId: string,
  scope: RequirementSource["scope"],
  owner: string | null = null,
): RequirementSource => ({
  familyId,
  scope,
  countryId: scope === "country" ? owner : null,
  chapterId: scope === "chapter" ? owner : null,
});

describe("effectiveRequirements", () => {
  it("is global ∪ the chapter's country ∪ the chapter itself", () => {
    const rows = [
      requirement("basics", "global"),
      requirement("traffic-de", "country", "country-de"),
      requirement("traffic-dk", "country", "country-dk"),
      requirement("berlin-hills", "chapter", "chapter-berlin"),
      requirement("aarhus-port", "chapter", "chapter-aarhus"),
    ];
    expect(
      effectiveRequirements(rows, BERLIN).map((row) => row.familyId),
    ).toEqual(["basics", "traffic-de", "berlin-hills"]);
  });

  it("lists a family once, by its broadest source, when a chapter repeats its country", () => {
    const rows = [
      requirement("traffic-de", "chapter", "chapter-berlin"),
      requirement("traffic-de", "country", "country-de"),
    ];
    expect(effectiveRequirements(rows, BERLIN)).toEqual([
      requirement("traffic-de", "country", "country-de"),
    ]);
  });
});

const exemption = (familyKey: string): ExemptionFact => ({
  familyKey,
  familyId: familyKey === BLANKET_EXEMPTION ? null : familyKey,
  reason: "manual",
  grantedAt: new Date("2026-10-01"),
  grantedByUserId: "admin-1",
  chapterId: "chapter-berlin",
});

describe("exemptionFor", () => {
  it("prefers the family's own exemption over a blanket one", () => {
    const rows = [exemption(BLANKET_EXEMPTION), exemption("basics")];
    expect(exemptionFor(rows, "basics")?.familyKey).toBe("basics");
    expect(exemptionFor(rows, "other")?.familyKey).toBe(BLANKET_EXEMPTION);
    expect(exemptionFor([exemption("basics")], "other")).toBeNull();
  });
});

const day = (n: number) => new Date(Date.UTC(2026, 9, n));

const variant = (
  courseId: string,
  language: string,
  overrides: Partial<VariantFacts> = {},
): VariantFacts => ({
  courseId,
  language,
  totalElements: 3,
  completedElements: 0,
  currentElementTitle: "Braking",
  enrollment: null,
  ...overrides,
});

describe("familyStatus", () => {
  it("ignores a family without a published variant", () => {
    expect(familyStatus("basics", [], [])).toBeNull();
  });

  it("counts a pass in any language variant", () => {
    const status = familyStatus("basics", [
      variant("basics-en", "en"),
      variant("basics-de", "de", {
        completedElements: 3,
        enrollment: {
          startedAt: day(1),
          lastActivityAt: day(2),
          passedAt: day(2),
          attemptCount: 2,
        },
      }),
    ]);
    expect(status).toMatchObject({
      status: "passed",
      percent: 100,
      passedAt: day(2),
      attempts: 2,
      variantCourseId: "basics-de",
      currentLessonTitle: null,
    });
  });

  it("stays passed when the owner adds an element after the pass", () => {
    const status = familyStatus("basics", [
      variant("basics-en", "en", {
        totalElements: 4,
        completedElements: 3,
        currentElementTitle: "Our hill",
        enrollment: {
          startedAt: day(1),
          lastActivityAt: day(2),
          passedAt: day(2),
          attemptCount: 1,
        },
      }),
    ]);
    expect(status?.status).toBe("passed");
  });

  it("reports progress on the variant worked on last", () => {
    const status = familyStatus("basics", [
      variant("basics-en", "en", {
        completedElements: 1,
        enrollment: {
          startedAt: day(1),
          lastActivityAt: day(1),
          passedAt: null,
          attemptCount: 0,
        },
      }),
      variant("basics-de", "de", {
        completedElements: 2,
        currentElementTitle: "Kurven",
        enrollment: {
          startedAt: day(3),
          lastActivityAt: day(4),
          passedAt: null,
          attemptCount: 1,
        },
      }),
    ]);
    expect(status).toMatchObject({
      status: "inProgress",
      percent: 67,
      attempts: 1,
      startedAt: day(1),
      lastActivityAt: day(4),
      currentLessonTitle: "Kurven",
      variantCourseId: "basics-de",
    });
  });

  it("reports 0% for a started course without elements", () => {
    const status = familyStatus("basics", [
      variant("basics-en", "en", {
        totalElements: 0,
        enrollment: {
          startedAt: day(1),
          lastActivityAt: day(1),
          passedAt: null,
          attemptCount: 0,
        },
      }),
    ]);
    expect(status).toMatchObject({ status: "inProgress", percent: 0 });
  });

  it("is exempt with a blanket or a per-family exemption, unless already passed", () => {
    const fresh = [variant("basics-en", "en")];
    expect(
      familyStatus("basics", fresh, [exemption(BLANKET_EXEMPTION)])?.status,
    ).toBe("exempt");
    expect(familyStatus("basics", fresh, [exemption("basics")])?.status).toBe(
      "exempt",
    );
    expect(familyStatus("basics", fresh, [exemption("other")])?.status).toBe(
      "notStarted",
    );
  });

  it("points a newcomer at the variant in their language", () => {
    const status = familyStatus(
      "basics",
      [variant("basics-en", "en"), variant("basics-da", "da")],
      [],
      ["da", "en"],
    );
    expect(status).toMatchObject({
      status: "notStarted",
      percent: 0,
      variantCourseId: "basics-da",
    });
  });
});

describe("readinessOf", () => {
  it("needs every family passed or exempt and the in-person training confirmed", () => {
    const done = [{ status: "passed" as const }, { status: "exempt" as const }];
    expect(readinessOf(done, true)).toEqual({ coursesDone: true, ready: true });
    expect(readinessOf(done, false)).toEqual({
      coursesDone: true,
      ready: false,
    });
    expect(
      readinessOf([...done, { status: "inProgress" as const }], true),
    ).toEqual({ coursesDone: false, ready: false });
    expect(readinessOf([], true)).toEqual({ coursesDone: true, ready: true });
  });
});
