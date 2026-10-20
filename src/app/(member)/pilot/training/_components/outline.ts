import type { CourseCard } from "@/use-cases/training-access";
import type { Locale as NotationLocale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { durationLabel, elementHref } from "./format";

export type OutlineItem = {
  id: string;
  kind: "lesson" | "quiz";
  title: string;
  href: string;
  duration: string | null;
  hint: string | null;
  ratio: number;
  completed: boolean;
  locked: boolean;
  hasVideo: boolean;
};

export type OutlineStrings = {
  title: string;
  done: string;
  upNext: string;
  reading: string;
  lockedLesson: string;
  lockedQuiz: string;
};

export function outlineOf(
  card: CourseCard,
  dict: Dictionary,
  language: string,
  notation: NotationLocale,
) {
  const strings = dict.pilot.training.course;
  const items: OutlineItem[] = card.elements.map((element) => ({
    id: element.id,
    kind: element.kind,
    title: element.title,
    href: elementHref(card.courseId, element.id),
    duration: durationLabel(element.durationSeconds, notation),
    hint:
      element.kind === "quiz"
        ? formatMessage(
            strings.quizHint,
            { count: element.questionCount },
            language,
          )
        : null,
    ratio:
      element.durationSeconds && element.progress
        ? Math.min(
            1,
            element.progress.furthestSeconds / element.durationSeconds,
          )
        : 0,
    completed: element.completed,
    locked: element.locked,
    hasVideo: element.hasVideo,
  }));
  const outlineStrings: OutlineStrings = {
    title: strings.outline,
    done: strings.done,
    upNext: strings.upNext,
    reading: strings.reading,
    lockedLesson: strings.lockedHint,
    lockedQuiz: strings.quizLocked,
  };
  return { items, strings: outlineStrings };
}

export type CourseOutline = ReturnType<typeof outlineOf>;
