import {
  courseComplete,
  elementGates,
  isReachable,
  nextOpenElement,
  percentComplete,
  type ElementFact,
} from "./elements";

const lesson = (id: string, completed = false): ElementFact => ({
  id,
  kind: "lesson",
  completed,
});
const quiz = (id: string, completed = false): ElementFact => ({
  id,
  kind: "quiz",
  completed,
});

const locks = (elements: ElementFact[]) =>
  Object.fromEntries(
    elementGates(elements).map((gate) => [gate.id, gate.locked]),
  );

describe("elementGates", () => {
  it("leaves lessons before the first quiz open in any order", () => {
    expect(locks([lesson("a"), lesson("b"), lesson("c")])).toEqual({
      a: false,
      b: false,
      c: false,
    });
  });

  it("locks a quiz until everything before it is complete", () => {
    expect(locks([lesson("a", true), lesson("b"), quiz("q")])).toMatchObject({
      q: true,
    });
    expect(
      locks([lesson("a", true), lesson("b", true), quiz("q")]),
    ).toMatchObject({ q: false });
  });

  it("locks everything after an unpassed quiz", () => {
    expect(
      locks([lesson("a", true), quiz("q"), lesson("b"), lesson("c")]),
    ).toEqual({ a: false, q: false, b: true, c: true });
  });

  it("opens the next section once the quiz is passed", () => {
    expect(
      locks([lesson("a", true), quiz("q", true), lesson("b"), quiz("q2")]),
    ).toEqual({ a: false, q: false, b: false, q2: true });
  });

  it("handles several quizzes in a row and a quiz first", () => {
    expect(locks([quiz("q1"), quiz("q2"), lesson("a")])).toEqual({
      q1: false,
      q2: true,
      a: true,
    });
    expect(locks([quiz("q1", true), quiz("q2"), lesson("a")])).toEqual({
      q1: false,
      q2: false,
      a: true,
    });
  });

  it("never locks a completed element", () => {
    const gates = elementGates([
      lesson("a"),
      quiz("q"),
      lesson("b", true),
      quiz("q2", true),
    ]);
    expect(gates.map((gate) => [gate.id, gate.locked])).toEqual([
      ["a", false],
      ["q", true],
      ["b", false],
      ["q2", false],
    ]);
    expect(gates.every((gate) => !gate.completed || isReachable(gate))).toBe(
      true,
    );
  });

  it("keeps the element's own fields", () => {
    const [gate] = elementGates([{ ...lesson("a"), title: "Brakes" }]);
    expect(gate).toEqual({
      id: "a",
      kind: "lesson",
      completed: false,
      title: "Brakes",
      locked: false,
    });
  });
});

describe("progress helpers", () => {
  const elements = [lesson("a", true), quiz("q"), lesson("b")];

  it("finds the first incomplete element", () => {
    expect(nextOpenElement(elements)?.id).toBe("q");
    expect(nextOpenElement([lesson("a", true)])).toBeNull();
  });

  it("counts every element the same", () => {
    expect(percentComplete(elements)).toBe(33);
    expect(percentComplete([])).toBe(0);
    expect(percentComplete([lesson("a", true), quiz("q", true)])).toBe(100);
  });

  it("completes a course only when every element is complete", () => {
    expect(courseComplete(elements)).toBe(false);
    expect(courseComplete([lesson("a", true), quiz("q", true)])).toBe(true);
    expect(courseComplete([])).toBe(false);
  });
});
