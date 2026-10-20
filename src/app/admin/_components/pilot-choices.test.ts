import { readinessHint, withReadiness } from "./pilot-choices";

const labels = {
  trainingIncomplete: "Training incomplete",
  inPersonMissing: "In-person training missing",
};

describe("readinessHint", () => {
  it("is empty for a ready pilot", () => {
    expect(readinessHint({ ready: true, coursesDone: true }, labels)).toBe(
      null,
    );
  });

  it("names the missing in-person training once the courses are done", () => {
    expect(readinessHint({ ready: false, coursesDone: true }, labels)).toBe(
      labels.inPersonMissing,
    );
  });

  it("names the training while courses are open", () => {
    expect(readinessHint({ ready: false, coursesDone: false }, labels)).toBe(
      labels.trainingIncomplete,
    );
  });

  it("treats an unknown pilot as not ready", () => {
    expect(readinessHint(undefined, labels)).toBe(labels.trainingIncomplete);
  });
});

describe("withReadiness", () => {
  const readiness = new Map([
    ["a", { ready: false, coursesDone: false }],
    ["b", { ready: true, coursesDone: true }],
    ["c", { ready: false, coursesDone: true }],
  ]);

  it("disables not-ready pilots with a hint and lists them last", () => {
    const result = withReadiness(
      [{ id: "a" }, { id: "b", hint: "Berlin" }, { id: "c" }],
      (choice) => readiness.get(choice.id),
      labels,
    );
    expect(result).toEqual([
      { id: "b", hint: "Berlin" },
      { id: "a", hint: labels.trainingIncomplete, disabled: true },
      { id: "c", hint: labels.inPersonMissing, disabled: true },
    ]);
  });
});
