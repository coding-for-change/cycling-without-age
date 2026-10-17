import type {
  OwnReadiness,
  ReadinessCourse,
} from "@/use-cases/pilot-readiness";
import { nextStep, requiredCourses, summarizeReadiness } from "./readiness";

const course = (
  familyId: string,
  status: ReadinessCourse["status"],
): ReadinessCourse => ({
  familyId,
  name: familyId,
  status,
  percent: status === "passed" ? 100 : 0,
  passedAt: null,
  startedAt: null,
  lastActivityAt: null,
  attempts: 0,
  currentLessonTitle: null,
  variantCourseId: `${familyId}-course`,
  exemption: null,
});

const chapter = (
  chapterId: string,
  courses: ReadinessCourse[],
  options: { ready?: boolean; status?: "pilot" | "applicant" } = {},
): OwnReadiness["chapters"][number] => ({
  userId: "user",
  chapterId,
  ready: options.ready ?? false,
  coursesDone: false,
  courses,
  inPerson: { confirmedAt: null, confirmedBy: null },
  status: options.status ?? "pilot",
});

const own = (
  chapters: OwnReadiness["chapters"],
  confirmedAt: Date | null = null,
): OwnReadiness => ({
  chapters,
  coursesDone: false,
  inPerson: { confirmedAt, confirmedBy: confirmedAt ? "admin" : null },
});

describe("requiredCourses", () => {
  it("lists each family once across chapters", () => {
    const required = requiredCourses(
      own([
        chapter("a", [
          course("basic", "passed"),
          course("safety", "notStarted"),
        ]),
        chapter("b", [
          course("basic", "passed"),
          course("night", "notStarted"),
        ]),
      ]),
    );
    expect(required.map((item) => item.familyId)).toEqual([
      "basic",
      "safety",
      "night",
    ]);
  });
});

describe("nextStep", () => {
  it("continues a started course before starting a new one", () => {
    const step = nextStep(
      [course("a", "notStarted"), course("b", "inProgress")],
      false,
    );
    expect(step).toEqual({ kind: "course", course: course("b", "inProgress") });
  });

  it("skips passed and exempt families", () => {
    const step = nextStep(
      [course("a", "exempt"), course("b", "passed"), course("c", "notStarted")],
      false,
    );
    expect(step?.kind === "course" && step.course.familyId).toBe("c");
  });

  it("points at the in-person training once every course is done", () => {
    expect(nextStep([course("a", "passed")], false)).toEqual({
      kind: "inPerson",
    });
  });

  it("has nothing left when in-person training is confirmed", () => {
    expect(nextStep([course("a", "exempt")], true)).toBeNull();
  });
});

describe("summarizeReadiness", () => {
  it("counts required families plus the in-person step", () => {
    const summary = summarizeReadiness(
      own([chapter("a", [course("x", "passed"), course("y", "notStarted")])]),
    );
    expect(summary).toMatchObject({
      ready: false,
      done: 1,
      total: 3,
      applicant: false,
      chapters: null,
    });
    expect(summary.ratio).toBeCloseTo(1 / 3);
    expect(summary.next).toEqual({
      kind: "course",
      course: course("y", "notStarted"),
    });
  });

  it("counts a confirmed in-person training without required courses", () => {
    const confirmed = new Date("2026-10-01T10:00:00Z");
    const summary = summarizeReadiness(
      own([chapter("a", [], { ready: true })], confirmed),
    );
    expect(summary).toMatchObject({
      ready: true,
      done: 1,
      total: 1,
      ratio: 1,
      next: null,
      inPersonConfirmedAt: confirmed,
    });
  });

  it("flags applicants who can train while their application is pending", () => {
    const summary = summarizeReadiness(
      own([chapter("a", [course("x", "inProgress")], { status: "applicant" })]),
    );
    expect(summary.applicant).toBe(true);
  });

  it("is not an applicant when one chapter already approved them", () => {
    const summary = summarizeReadiness(
      own([
        chapter("a", [], { status: "applicant" }),
        chapter("b", [], { status: "pilot" }),
      ]),
    );
    expect(summary.applicant).toBe(false);
  });

  it("splits per chapter only when the chapters disagree", () => {
    const same = summarizeReadiness(own([chapter("a", []), chapter("b", [])]));
    expect(same.chapters).toBeNull();

    const differ = summarizeReadiness(
      own([
        chapter("a", [], { ready: true }),
        chapter("b", [course("night", "notStarted")]),
      ]),
    );
    expect(differ.ready).toBe(false);
    expect(differ.chapters).toEqual([
      { chapterId: "a", ready: true, applicant: false },
      { chapterId: "b", ready: false, applicant: false },
    ]);
  });

  it("is never ready without a training chapter", () => {
    expect(summarizeReadiness(own([])).ready).toBe(false);
  });
});
