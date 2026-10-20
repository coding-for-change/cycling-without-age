import { isSatisfied } from "@/features/training/requirements";
import type {
  OwnReadiness,
  ReadinessCourse,
} from "@/use-cases/pilot-readiness";

export type ReadinessStep =
  { kind: "course"; course: ReadinessCourse } | { kind: "inPerson" };

export type ChapterReadiness = {
  chapterId: string;
  ready: boolean;
  applicant: boolean;
};

export type ReadinessSummary = {
  ready: boolean;
  done: number;
  total: number;
  ratio: number;
  required: ReadinessCourse[];
  inPersonConfirmedAt: Date | null;
  next: ReadinessStep | null;
  applicant: boolean;
  chapters: ChapterReadiness[] | null;
};

const ORDER: Record<ReadinessCourse["status"], number> = {
  inProgress: 0,
  notStarted: 1,
  passed: 2,
  exempt: 2,
};

export function requiredCourses(own: OwnReadiness): ReadinessCourse[] {
  const seen = new Map<string, ReadinessCourse>();
  for (const chapter of own.chapters)
    for (const course of chapter.courses)
      if (!seen.has(course.familyId)) seen.set(course.familyId, course);
  return [...seen.values()];
}

export function nextStep(
  required: ReadinessCourse[],
  inPersonConfirmed: boolean,
): ReadinessStep | null {
  const open = required
    .filter((course) => !isSatisfied(course.status))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  if (open[0]) return { kind: "course", course: open[0] };
  return inPersonConfirmed ? null : { kind: "inPerson" };
}

export function summarizeReadiness(own: OwnReadiness): ReadinessSummary {
  const required = requiredCourses(own);
  const confirmed = own.inPerson.confirmedAt !== null;
  const done =
    required.filter((course) => isSatisfied(course.status)).length +
    (confirmed ? 1 : 0);
  const total = required.length + 1;
  const ready =
    own.chapters.length > 0 && own.chapters.every((chapter) => chapter.ready);
  const split =
    own.chapters.length > 1 &&
    new Set(own.chapters.map((chapter) => chapter.ready)).size > 1;

  return {
    ready,
    done,
    total,
    ratio: ready ? 1 : done / total,
    required,
    inPersonConfirmedAt: own.inPerson.confirmedAt,
    next: ready ? null : nextStep(required, confirmed),
    applicant:
      own.chapters.length > 0 &&
      own.chapters.every((chapter) => chapter.status === "applicant"),
    chapters: split
      ? own.chapters.map((chapter) => ({
          chapterId: chapter.chapterId,
          ready: chapter.ready,
          applicant: chapter.status === "applicant",
        }))
      : null,
  };
}
