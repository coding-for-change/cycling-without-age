"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Eye } from "lucide-react";
import { reportSave, type SaveLabels } from "@/components/action-feedback";
import { useSaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { updateElementAction } from "@/features/training/actions";
import {
  QuizEditor,
  type QuizEditorListLabels,
} from "@/features/training/components/quiz-editor";
import type { QuizEditorQuestion } from "@/features/training/components/quiz-editor-card";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { ElementHeader, type ElementHeaderLabels } from "./element-header";

export type QuizSettingsLabels = {
  settings: string;
  shuffle: string;
  shuffleHint: string;
  draw: string;
  drawAll: string;
  drawCount: string;
  preview: string;
  readOnly: string;
  save: SaveLabels;
};

export type QuizElementData = {
  id: string;
  courseTitle: string;
  title: string;
  shuffle: boolean;
  drawCount: number | null;
};

export function ElementQuiz({
  quiz,
  questions,
  canManage,
  previewHref,
  language,
  labels,
}: {
  quiz: QuizElementData;
  questions: QuizEditorQuestion[];
  canManage: boolean;
  previewHref: string;
  language: Locale;
  labels: {
    header: ElementHeaderLabels;
    settings: QuizSettingsLabels;
    editor: QuizEditorListLabels;
  };
}) {
  return (
    <>
      <ElementHeader
        elementId={quiz.id}
        kind="quiz"
        courseTitle={quiz.courseTitle}
        title={quiz.title}
        canManage={canManage}
        language={language}
        labels={labels.header}
      >
        {questions.length > 0 ? (
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="shrink-0"
          >
            <Link
              href={previewHref}
              aria-label={labels.settings.preview}
            >
              <Eye aria-hidden />
              <span className="max-sm:hidden">{labels.settings.preview}</span>
            </Link>
          </Button>
        ) : null}
      </ElementHeader>
      <QuizSettings
        quiz={quiz}
        total={questions.length}
        editable={canManage}
        language={language}
        labels={labels.settings}
      />
      <QuizEditor
        elementId={quiz.id}
        questions={questions}
        editable={canManage}
        language={language}
        labels={labels.editor}
      />
    </>
  );
}

function QuizSettings({
  quiz,
  total,
  editable,
  language,
  labels,
}: {
  quiz: QuizElementData;
  total: number;
  editable: boolean;
  language: Locale;
  labels: QuizSettingsLabels;
}) {
  const shuffleId = useId();
  const drawId = useId();
  const report = useSaveStatus();
  const [pending, startTransition] = useTransition();
  const [shuffle, setShuffle] = useState(quiz.shuffle);
  const [draw, setDraw] = useState(quiz.drawCount);
  const [synced, setSynced] = useState(quiz);
  if (synced.shuffle !== quiz.shuffle || synced.drawCount !== quiz.drawCount) {
    setSynced(quiz);
    setShuffle(quiz.shuffle);
    setDraw(quiz.drawCount);
  }

  const saveShuffle = (next: boolean, undoing = false) => {
    const previous = shuffle;
    setShuffle(next);
    report("saving");
    startTransition(async () => {
      const ok = reportSave(
        await updateElementAction(quiz.id, { quizShuffle: next }),
        {
          report,
          labels: labels.save,
          undo: undoing ? undefined : () => saveShuffle(previous, true),
          undoing,
        },
      );
      if (!ok) setShuffle(previous);
    });
  };

  const saveDraw = (next: number | null, undoing = false) => {
    const previous = draw;
    setDraw(next);
    report("saving");
    startTransition(async () => {
      const ok = reportSave(
        await updateElementAction(quiz.id, { quizDrawCount: next }),
        {
          report,
          labels: labels.save,
          undo: undoing ? undefined : () => saveDraw(previous, true),
          undoing,
        },
      );
      if (!ok) setDraw(previous);
    });
  };

  const counts = Array.from(
    { length: Math.max(0, total - 1) },
    (_, index) => index + 1,
  );
  const drawValue = draw !== null && draw < total ? String(draw) : "all";

  return (
    <section
      aria-label={labels.settings}
      aria-busy={pending}
      className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-b border-line px-4 py-3 sm:px-5"
    >
      <div className="flex items-center gap-3">
        <Switch
          id={shuffleId}
          checked={shuffle}
          disabled={!editable || pending}
          onCheckedChange={(next) => saveShuffle(next)}
        />
        <label
          htmlFor={shuffleId}
          title={labels.shuffleHint}
          className="text-2sm text-ink"
        >
          {labels.shuffle}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <label
          htmlFor={drawId}
          className="text-2sm text-ink"
        >
          {labels.draw}
        </label>
        <NativeSelect
          id={drawId}
          size="sm"
          value={drawValue}
          disabled={!editable || pending || total < 2}
          onChange={(event) =>
            saveDraw(
              event.target.value === "all" ? null : Number(event.target.value),
            )
          }
          className="border-line text-2sm"
        >
          <NativeSelectOption value="all">{labels.drawAll}</NativeSelectOption>
          {counts.map((count) => (
            <NativeSelectOption
              key={count}
              value={String(count)}
            >
              {formatMessage(labels.drawCount, { count }, language)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <p className="min-w-0 flex-1 text-xs text-pretty text-ink-soft max-md:basis-full">
        {editable ? labels.shuffleHint : labels.readOnly}
      </p>
    </section>
  );
}
