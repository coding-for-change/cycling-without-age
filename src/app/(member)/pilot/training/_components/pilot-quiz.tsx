"use client";

import {
  QuizFlow,
  type QuizAttemptView,
  type QuizFlowStrings,
} from "@/features/training/components/quiz-flow";
import type { Locale } from "@/lib/format";
import { useViewerDate } from "@/lib/viewer-time";
import { startQuizAction, submitQuizAction } from "../actions";

export function PilotQuiz({
  courseId,
  elementId,
  initial,
  locked,
  lockedHref,
  passedAt,
  notation,
  continueHref,
  final,
  strings,
  language,
}: {
  courseId: string;
  elementId: string;
  initial: QuizAttemptView;
  locked: boolean;
  lockedHref: string | null;
  passedAt: string | null;
  notation: Locale;
  continueHref: string;
  final: boolean;
  strings: QuizFlowStrings;
  language: string;
}) {
  const passedOn = useViewerDate(passedAt, notation);

  return (
    <QuizFlow
      mode="pilot"
      initial={initial}
      locked={locked}
      lockedHref={lockedHref}
      passedOn={passedOn}
      strings={strings}
      language={language}
      backHref={`/pilot/training/${courseId}`}
      doneHref={final ? "/pilot/training" : continueHref}
      final={final}
      onStart={() => void startQuizAction(courseId, elementId)}
      submit={(answers) => submitQuizAction(courseId, elementId, answers)}
    />
  );
}
