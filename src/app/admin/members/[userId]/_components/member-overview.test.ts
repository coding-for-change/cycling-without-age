import {
  attentionItems,
  readinessOf,
  trainingPercent,
} from "./member-overview";

const course = (
  name: string,
  status: "passed" | "exempt" | "inProgress" | "notStarted",
  percent = 0,
) => ({ name, status, percent });

describe("trainingPercent", () => {
  it("counts passed and exempt courses as done and in-person as one step", () => {
    expect(
      trainingPercent(
        [
          course("A", "passed", 40),
          course("B", "exempt"),
          course("C", "inProgress", 50),
        ],
        false,
      ),
    ).toBe(63);
  });

  it("is the in-person step alone without courses", () => {
    expect(trainingPercent([], true)).toBe(100);
    expect(trainingPercent([], false)).toBe(0);
  });

  it("clamps out-of-range course percentages", () => {
    expect(trainingPercent([course("A", "inProgress", 140)], true)).toBe(100);
  });
});

describe("readinessOf", () => {
  it("is ready only when every chapter is ready", () => {
    expect(readinessOf([{ ready: true }, { ready: true }])).toEqual({
      state: "ready",
    });
  });

  it("is partial when some chapters are ready", () => {
    expect(readinessOf([{ ready: true }, { ready: false }])).toEqual({
      state: "partial",
      ready: 1,
      total: 2,
    });
  });

  it("is not ready without chapters or without any ready chapter", () => {
    expect(readinessOf([])).toEqual({ state: "notReady" });
    expect(readinessOf([{ ready: false }])).toEqual({ state: "notReady" });
  });
});

describe("attentionItems", () => {
  const courses = [
    course("Basic", "notStarted"),
    course("Advanced", "inProgress", 30),
    course("Safety", "passed", 100),
    course("Night", "exempt"),
  ];

  it("lists the open in-person step and every unfinished course", () => {
    expect(
      attentionItems({
        trainingRequired: true,
        inPersonConfirmed: false,
        courses,
      }),
    ).toEqual([
      { kind: "inPerson" },
      { kind: "notStarted", course: "Basic" },
      { kind: "inProgress", course: "Advanced" },
    ]);
  });

  it("ignores courses when training is not required", () => {
    expect(
      attentionItems({
        trainingRequired: false,
        inPersonConfirmed: false,
        courses,
      }),
    ).toEqual([{ kind: "inPerson" }]);
  });

  it("is empty when everything is settled", () => {
    expect(
      attentionItems({
        trainingRequired: true,
        inPersonConfirmed: true,
        courses: [course("Safety", "passed", 100)],
      }),
    ).toEqual([]);
  });
});
