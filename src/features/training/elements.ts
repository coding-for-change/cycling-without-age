export type ElementKindName = "lesson" | "quiz";

export type ElementFact = {
  id: string;
  kind: ElementKindName;
  completed: boolean;
};

export type ElementGate = { locked: boolean; completed: boolean };

export function elementGates<E extends ElementFact>(
  elements: readonly E[],
): (E & ElementGate)[] {
  let quizOpen = false;
  let allBefore = true;
  return elements.map((element) => {
    const locked = quizOpen || (element.kind === "quiz" && !allBefore);
    if (element.kind === "quiz" && !element.completed) quizOpen = true;
    if (!element.completed) allBefore = false;
    return { ...element, locked: locked && !element.completed };
  });
}

export const isReachable = (gate: ElementGate) => !gate.locked;

export const courseComplete = (elements: readonly { completed: boolean }[]) =>
  elements.length > 0 && elements.every((element) => element.completed);

export const nextOpenElement = <E extends { completed: boolean }>(
  elements: readonly E[],
) => elements.find((element) => !element.completed) ?? null;

export const percentComplete = (elements: readonly { completed: boolean }[]) =>
  elements.length === 0
    ? 0
    : Math.round(
        (elements.filter((element) => element.completed).length /
          elements.length) *
          100,
      );
