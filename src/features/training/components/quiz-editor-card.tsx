"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  Check,
  CircleAlert,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { notify } from "@/components/action-feedback";
import { useSaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SortableItemHandle } from "@/components/ui/sortable";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { deleteQuestionAction, saveQuestionAction } from "../actions";
import { questionIssues, type QuestionIssue } from "../grade";
import { MAX_OPTIONS, MIN_OPTIONS, type QuestionKind } from "../schemas";

export type QuizEditorQuestion = {
  id: string;
  kind: QuestionKind;
  prompt: string;
  explanation: string | null;
  options: { id: string; text: string; correct: boolean }[];
};

export type QuizEditorLabels = {
  number: string;
  kindLabel: string;
  kinds: Record<QuestionKind, string>;
  prompt: string;
  promptPlaceholder: string;
  options: string;
  optionPlaceholder: string;
  addOption: string;
  removeOption: string;
  markCorrect: string;
  correct: string;
  explanation: string;
  explanationPlaceholder: string;
  delete: string;
  deleted: string;
  drag: string;
  issues: Record<QuestionIssue, string>;
  errors: { generic: string } & Record<string, string>;
};

type DraftOption = {
  key: string;
  id?: string;
  text: string;
  correct: boolean;
};

type Draft = {
  kind: QuestionKind;
  prompt: string;
  explanation: string;
  options: DraftOption[];
};

const SAVE_DELAY_MS = 600;

let keySeed = 0;
const nextKey = () => `new-${++keySeed}`;

const draftOf = (question: QuizEditorQuestion): Draft => ({
  kind: question.kind,
  prompt: question.prompt,
  explanation: question.explanation ?? "",
  options: question.options.map((option) => ({
    key: option.id,
    id: option.id,
    text: option.text,
    correct: option.correct,
  })),
});

export function QuizEditorCard({
  question,
  number,
  editable,
  sortable,
  language,
  labels,
}: {
  question: QuizEditorQuestion;
  number: number;
  editable: boolean;
  sortable: boolean;
  language: Locale;
  labels: QuizEditorLabels;
}) {
  const promptId = useId();
  const explanationId = useId();
  const report = useSaveStatus();
  const [draft, setDraft] = useState<Draft>(() => draftOf(question));
  const [deleting, startDelete] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(draft);
  const dirty = useRef(false);
  const issues = questionIssues(draft);
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, language);

  const persist = async () => {
    if (!dirty.current) return;
    dirty.current = false;
    const snapshot = latest.current;
    report("saving");
    const result = await saveQuestionAction(question.id, {
      kind: snapshot.kind,
      prompt: snapshot.prompt,
      explanation: snapshot.explanation,
      options: snapshot.options.map(({ id, text, correct }) => ({
        id,
        text,
        correct,
      })),
    });
    if (!result.ok) {
      report("failed");
      haptics.error();
      toast.error(labels.errors[result.error] ?? labels.errors.generic);
      return;
    }
    report("saved");
    const ids = new Map(
      snapshot.options.map((option, index) => [
        option.key,
        result.options[index]?.id,
      ]),
    );
    setDraft((current) => {
      const next = {
        ...current,
        options: current.options.map((option) =>
          option.id ? option : { ...option, id: ids.get(option.key) },
        ),
      };
      latest.current = next;
      return next;
    });
  };

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void persistRef.current();
    },
    [],
  );

  const update = (change: (current: Draft) => Draft) => {
    setDraft((current) => {
      const next = change(current);
      latest.current = next;
      return next;
    });
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persistRef.current(), SAVE_DELAY_MS);
  };

  const setKind = (kind: QuestionKind) =>
    update((current) => {
      if (kind === "multiple") return { ...current, kind };
      const first = current.options.findIndex((option) => option.correct);
      return {
        ...current,
        kind,
        options: current.options.map((option, index) => ({
          ...option,
          correct: index === first,
        })),
      };
    });

  const toggleCorrect = (key: string) =>
    update((current) => ({
      ...current,
      options: current.options.map((option) =>
        current.kind === "single"
          ? { ...option, correct: option.key === key }
          : option.key === key
            ? { ...option, correct: !option.correct }
            : option,
      ),
    }));

  const remove = () =>
    startDelete(async () => {
      if (timer.current) clearTimeout(timer.current);
      dirty.current = false;
      notify(await deleteQuestionAction(question.id), {
        done: labels.deleted,
        errors: labels.errors,
      });
    });

  const title = say(labels.number, { number });

  return (
    <article
      aria-label={title}
      aria-busy={deleting}
      className={cn(
        "grid gap-4 rounded-xl border border-line bg-canvas p-4 transition-opacity",
        deleting && "opacity-50",
      )}
    >
      <header className="flex items-center gap-2">
        {sortable ? (
          <SortableItemHandle
            aria-label={say(labels.drag, { number })}
            className="-ml-1 flex size-7 items-center justify-center rounded text-ink-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
          >
            <GripVertical
              aria-hidden
              className="size-4"
            />
          </SortableItemHandle>
        ) : null}
        <h2 className="text-2sm font-medium">{title}</h2>
        <span className="ml-auto flex items-center gap-1.25">
          <ToggleGroup
            type="single"
            value={draft.kind}
            disabled={!editable}
            onValueChange={(next) => {
              if (next === "single" || next === "multiple")
                if (next !== draft.kind) setKind(next);
            }}
            aria-label={labels.kindLabel}
            spacing={0.5}
            className="rounded-lg bg-canvas-deep p-0.5"
          >
            {(["single", "multiple"] as const).map((kind) => (
              <ToggleGroupItem
                key={kind}
                value={kind}
                className="h-7 rounded-md px-2.5 text-xs font-medium text-ink-soft hover:bg-transparent hover:text-ink focus-visible:ring-2 focus-visible:ring-ink data-[state=on]:bg-canvas data-[state=on]:text-ink"
              >
                {labels.kinds[kind]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {editable ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={deleting}
              aria-label={labels.delete}
              title={labels.delete}
              onClick={remove}
              className="size-8 text-ink-soft hover:bg-red-tint hover:text-red-ink"
            >
              <Trash2 aria-hidden />
            </Button>
          ) : null}
        </span>
      </header>

      <div className="grid gap-1.25">
        <label
          htmlFor={promptId}
          className="sr-only"
        >
          {labels.prompt}
        </label>
        <Textarea
          id={promptId}
          value={draft.prompt}
          readOnly={!editable}
          maxLength={2_000}
          rows={2}
          placeholder={labels.promptPlaceholder}
          onChange={(event) => {
            const prompt = event.target.value;
            update((current) => ({ ...current, prompt }));
          }}
          className="min-h-11 resize-none border-line text-base font-medium"
        />
      </div>

      <fieldset className="grid gap-1.25">
        <legend className="mb-1.25 text-xs text-ink-soft">
          {labels.options}
        </legend>
        <ul className="grid gap-1.25">
          {draft.options.map((option, index) => (
            <li
              key={option.key}
              className="group/option flex items-center gap-2"
            >
              <button
                type="button"
                role={draft.kind === "single" ? "radio" : "checkbox"}
                aria-checked={option.correct}
                aria-label={say(labels.markCorrect, { number: index + 1 })}
                disabled={!editable}
                onClick={() => toggleCorrect(option.key)}
                className={cn(
                  "grid size-6 shrink-0 place-items-center border transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:cursor-default",
                  draft.kind === "single" ? "rounded-full" : "rounded-md",
                  option.correct
                    ? "border-mint-deep bg-mint text-ink"
                    : "border-line bg-canvas text-transparent hover:border-ink-faint",
                )}
              >
                <Check
                  aria-hidden
                  className="size-3.5"
                />
              </button>
              <Input
                value={option.text}
                readOnly={!editable}
                maxLength={500}
                aria-label={say(labels.optionPlaceholder, {
                  number: index + 1,
                })}
                placeholder={say(labels.optionPlaceholder, {
                  number: index + 1,
                })}
                onChange={(event) => {
                  const text = event.target.value;
                  update((current) => ({
                    ...current,
                    options: current.options.map((row) =>
                      row.key === option.key ? { ...row, text } : row,
                    ),
                  }));
                }}
                className={cn(
                  "h-11 border-line",
                  option.correct && "bg-mint-tint",
                )}
              />
              {option.correct ? (
                <span className="sr-only">{labels.correct}</span>
              ) : null}
              {editable && draft.options.length > MIN_OPTIONS ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={say(labels.removeOption, { number: index + 1 })}
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      options: current.options.filter(
                        (row) => row.key !== option.key,
                      ),
                    }))
                  }
                  className="size-8 shrink-0 text-ink-soft opacity-0 transition-opacity group-hover/option:opacity-100 hover:text-ink focus-visible:opacity-100 pointer-coarse:opacity-100"
                >
                  <X aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {editable && draft.options.length < MAX_OPTIONS ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              update((current) => ({
                ...current,
                options: [
                  ...current.options,
                  { key: nextKey(), text: "", correct: false },
                ],
              }))
            }
            className="h-8 w-fit text-2sm text-ink-soft hover:text-ink"
          >
            <Plus aria-hidden />
            {labels.addOption}
          </Button>
        ) : null}
      </fieldset>

      <div className="grid gap-1.25">
        <label
          htmlFor={explanationId}
          className="text-xs text-ink-soft"
        >
          {labels.explanation}
        </label>
        <Textarea
          id={explanationId}
          value={draft.explanation}
          readOnly={!editable}
          maxLength={4_000}
          rows={2}
          placeholder={labels.explanationPlaceholder}
          onChange={(event) => {
            const explanation = event.target.value;
            update((current) => ({ ...current, explanation }));
          }}
          className="min-h-11 resize-none border-line text-2sm"
        />
      </div>

      {issues.length > 0 ? (
        <ul
          aria-live="polite"
          className="grid gap-1 rounded-lg bg-canvas-deep px-3 py-2"
        >
          {issues.map((issue) => (
            <li
              key={issue}
              className="flex items-center gap-2 text-2sm text-ink-soft"
            >
              <CircleAlert
                aria-hidden
                className="size-3.5 shrink-0"
              />
              {labels.issues[issue]}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
