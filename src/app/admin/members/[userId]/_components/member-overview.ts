import type { FamilyStatusName } from "@/features/training/requirements";

type OverviewCourse = {
  name: string;
  status: FamilyStatusName;
  percent: number;
};

export type AttentionItem =
  { kind: "inPerson" } | { kind: "notStarted" | "inProgress"; course: string };

export type Readiness =
  | { state: "ready" | "notReady" }
  | { state: "partial"; ready: number; total: number };

const settled = (status: FamilyStatusName) =>
  status === "passed" || status === "exempt";

export function trainingPercent(
  courses: OverviewCourse[],
  inPersonConfirmed: boolean,
): number {
  const parts = [
    ...courses.map((course) =>
      settled(course.status) ? 100 : Math.min(100, Math.max(0, course.percent)),
    ),
    inPersonConfirmed ? 100 : 0,
  ];
  return Math.round(parts.reduce((sum, part) => sum + part, 0) / parts.length);
}

export function readinessOf(chapters: { ready: boolean }[]): Readiness {
  const ready = chapters.filter((chapter) => chapter.ready).length;
  if (chapters.length > 0 && ready === chapters.length)
    return { state: "ready" };
  if (ready === 0) return { state: "notReady" };
  return { state: "partial", ready, total: chapters.length };
}

export function attentionItems({
  trainingRequired,
  inPersonConfirmed,
  courses,
}: {
  trainingRequired: boolean;
  inPersonConfirmed: boolean;
  courses: OverviewCourse[];
}): AttentionItem[] {
  const items: AttentionItem[] = inPersonConfirmed
    ? []
    : [{ kind: "inPerson" }];
  if (!trainingRequired) return items;
  for (const course of courses)
    if (course.status === "notStarted" || course.status === "inProgress")
      items.push({ kind: course.status, course: course.name });
  return items;
}
