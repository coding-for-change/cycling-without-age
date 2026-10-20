export type ReadinessHintLabels = {
  trainingIncomplete: string;
  inPersonMissing: string;
};

type ReadinessFact = { ready: boolean; coursesDone: boolean };

export function readinessHint(
  readiness: ReadinessFact | undefined,
  labels: ReadinessHintLabels,
): string | null {
  if (readiness?.ready) return null;
  return readiness?.coursesDone
    ? labels.inPersonMissing
    : labels.trainingIncomplete;
}

export function withReadiness<T extends { id: string; hint?: string }>(
  choices: T[],
  readinessOf: (choice: T) => ReadinessFact | undefined,
  labels: ReadinessHintLabels,
): (T & { disabled?: boolean })[] {
  const marked = choices.map((choice) => {
    const hint = readinessHint(readinessOf(choice), labels);
    return hint ? { ...choice, hint, disabled: true } : choice;
  });
  return [
    ...marked.filter((choice) => !("disabled" in choice)),
    ...marked.filter((choice) => "disabled" in choice),
  ];
}
