"use client";

import {
  QuizFlow,
  type QuizAttemptView,
  type QuizFlowStrings,
} from "@/features/training/components/quiz-flow";
import { startQuizAction, submitQuizAction } from "../actions";

export function PilotQuiz({
  courseId,
  elementId,
  initial,
  locked,
  lockedHref,
  passedOn,
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
  passedOn: string | null;
  continueHref: string;
  final: boolean;
  strings: QuizFlowStrings;
  language: string;
}) {
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
