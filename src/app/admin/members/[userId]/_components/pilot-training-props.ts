import { chapters as chapterFeature } from "@/features/chapters";
import { isTrainingRequired } from "@/lib/feature-flags";
import { formatNumber, type Locale as Notation } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { FALLBACK_TIME_ZONE } from "@/lib/time-zone";
import type {
  MemberTrainingPanel,
  PersonRef,
} from "@/use-cases/training-progress";
import {
  localDate,
  type StampContext,
} from "../../../_components/training-stamp";
import type { TrainingCourseView } from "./pilot-training";
import {
  courseAction,
  familyExemption,
  panelCourses,
} from "./pilot-training-facts";

export async function pilotTrainingProps({
  panel,
  dict,
  notation,
  words,
}: {
  panel: MemberTrainingPanel;
  dict: Dictionary;
  notation: Notation;
  words: string;
}) {
  const labels = dict.admin.members.training;
  const primary = panel.chapters[0].chapterId;
  const found = await chapterFeature.getChapterTimeZones(
    panel.chapters.map((chapter) => chapter.chapterId),
  );
  const byId = new Map(found.map((row) => [row.id, row]));
  const timeZone = byId.get(primary)?.timeZone ?? FALLBACK_TIME_ZONE;
  const context: StampContext = {
    notation,
    words,
    timeZone,
    now: new Date(),
  };
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, words);
  const date = (at: Date) => localDate(at, context);
  const nameOf = (ref: PersonRef) => ref.name ?? labels.formerAdmin;
  const percentOf = (percent: number) =>
    formatNumber(percent / 100, notation, {
      style: "percent",
      maximumFractionDigits: 0,
    });

  const provenance = (row: {
    reason: keyof typeof labels.reasons;
    grantedAt: Date;
    grantedBy: PersonRef | null;
  }) => {
    const reason = labels.reasons[row.reason];
    return row.grantedBy
      ? say(labels.grantedBy, {
          reason,
          name: nameOf(row.grantedBy),
          date: date(row.grantedAt),
        })
      : say(labels.grantedBySystem, { reason, date: date(row.grantedAt) });
  };

  const blanket = panel.blanketExemption;
  const courses = panelCourses(panel.chapters).map(
    (course): TrainingCourseView => {
      const own = familyExemption(panel.exemptions, course.familyId);
      const percentLabel = percentOf(course.percent);
      const summary =
        course.status === "passed" && course.passedAt
          ? say(labels.passedOn, { date: date(course.passedAt) })
          : course.status === "inProgress"
            ? course.currentLessonTitle
              ? say(labels.currentLesson, { lesson: course.currentLessonTitle })
              : percentLabel
            : course.status === "exempt"
              ? own
                ? labels.reasons[own.reason]
                : blanket
                  ? labels.reasons.experienced
                  : null
              : null;
      return {
        familyId: course.familyId,
        name: course.name,
        status: course.status,
        percent: course.percent,
        percentLabel,
        summary,
        details: [
          course.status === "inProgress" && course.currentLessonTitle
            ? percentLabel
            : null,
          course.status === "inProgress" || course.attempts > 0
            ? say(labels.attempts, { count: course.attempts })
            : null,
          course.startedAt && course.status !== "passed"
            ? say(labels.startedOn, { date: date(course.startedAt) })
            : null,
          own
            ? provenance(own)
            : blanket && course.status !== "passed"
              ? labels.coveredByBlanket
              : null,
        ].filter((line): line is string => line !== null),
        action: courseAction(course.status, own !== null, blanket !== null),
      };
    },
  );

  const { confirmedAt, confirmedBy } = panel.inPerson;

  const trainingRequired = isTrainingRequired();

  return {
    trainingRequired,
    timeZone,
    chapters: panel.chapters.map((chapter) => ({
      chapterId: chapter.chapterId,
      name: byId.get(chapter.chapterId)?.name ?? "",
      ready: chapter.ready,
    })),
    inPerson: {
      confirmed: confirmedAt !== null,
      provenance: confirmedAt
        ? confirmedBy
          ? say(labels.inPersonBy, {
              name: nameOf(confirmedBy),
              date: date(confirmedAt),
            })
          : say(labels.inPersonSystem, { date: date(confirmedAt) })
        : labels.inPersonWaiting,
    },
    blanket: {
      on: blanket !== null,
      provenance: blanket ? provenance(blanket) : null,
    },
    courses: trainingRequired ? courses : [],
    percentOf,
    labels: {
      ...labels,
      statuses: dict.admin.training.progress.statuses,
      undo: dict.common.field.undo,
      errors: { ...dict.common.errors, ...dict.admin.training.errors },
    },
  };
}
