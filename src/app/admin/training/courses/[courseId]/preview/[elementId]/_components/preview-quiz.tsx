"use client";

import { useRef } from "react";
import {
  QuizFlow,
  type QuizAttemptView,
  type QuizFlowStrings,
} from "@/features/training/components/quiz-flow";
import { previewQuizAction } from "@/features/training/actions";

export function PreviewQuiz({
  elementId,
  initial,
  strings,
  language,
  backHref,
}: {
  elementId: string;
  initial: QuizAttemptView;
  strings: QuizFlowStrings;
  language: string;
  backHref: string;
}) {
  const number = useRef(initial.number);

  return (
    <QuizFlow
      mode="preview"
      initial={initial}
      locked={false}
      strings={strings}
      language={language}
      backHref={backHref}
      doneHref={backHref}
      onStart={(next) => {
        number.current = next;
      }}
      submit={(answers) =>
        previewQuizAction(elementId, answers, number.current)
      }
    />
  );
}
