"use client";

import { useState, useTransition } from "react";
import { CircleAlert, GripVertical, ListChecks, Plus } from "lucide-react";
import { notify, reportSave } from "@/components/action-feedback";
import { EmptyState } from "@/components/empty-state";
import { useSaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { createQuestionAction, reorderQuestionsAction } from "../actions";
import { questionIssues } from "../grade";
import {
  QuizEditorCard,
  type QuizEditorLabels,
  type QuizEditorQuestion,
} from "./quiz-editor-card";

export type QuizEditorListLabels = QuizEditorLabels & {
  add: string;
  emptyTitle: string;
  empty: string;
  body: string;
  questions: string;
  untitled: string;
  needsWork: string;
  orderSaved: string;
  save: {
    saved: string;
    undo: string;
    undone: string;
    errors: QuizEditorLabels["errors"];
  };
};

const sameOrder = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export function QuizEditor({
  elementId,
  questions,
  editable,
  language,
  labels,
}: {
  elementId: string;
  questions: QuizEditorQuestion[];
  editable: boolean;
  language: Locale;
  labels: QuizEditorListLabels;
}) {
  const report = useSaveStatus();
  const [pending, startTransition] = useTransition();
  const serverOrder = questions.map((question) => question.id);
  const [order, setOrder] = useState(serverOrder);
  const [synced, setSynced] = useState(serverOrder);
  const [selected, setSelected] = useState<string | null>(
    serverOrder[0] ?? null,
  );
  if (!sameOrder(synced, serverOrder)) {
    setSynced(serverOrder);
    setOrder(serverOrder);
    if (!selected || !serverOrder.includes(selected)) {
      const gone = selected ? synced.indexOf(selected) : -1;
      setSelected(
        serverOrder[Math.min(Math.max(gone, 0), serverOrder.length - 1)] ??
          null,
      );
    }
  }
  const byId = new Map(questions.map((question) => [question.id, question]));
  const shown = order.flatMap((id) => byId.get(id) ?? []);
  const sortable = editable && questions.length > 1;
  const active = selected ? byId.get(selected) : undefined;
  const activeIndex = active ? order.indexOf(active.id) : -1;
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, language);

  const add = () =>
    startTransition(async () => {
      const result = await createQuestionAction(elementId);
      if (!result.ok) {
        notify(result, { done: "", errors: labels.errors });
        return;
      }
      setSelected(result.questionId);
    });

  const reorder = (next: string[], previous: string[], undoing = false) => {
    setOrder(next);
    report("saving");
    startTransition(async () => {
      const ok = reportSave(
        await reorderQuestionsAction({ elementId, questionIds: next }),
        {
          report,
          labels: { ...labels.save, saved: labels.orderSaved },
          undo: undoing ? undefined : () => reorder(previous, next, true),
          undoing,
        },
      );
      if (!ok) setOrder(previous);
    });
  };

  const addButton = editable ? (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={add}
      className="w-full justify-start"
    >
      <Plus aria-hidden />
      {labels.add}
    </Button>
  ) : null;

  if (questions.length === 0)
    return (
      <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-5">
        <EmptyState
          icon={ListChecks}
          title={labels.emptyTitle}
          className="border-none"
          action={
            editable ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={add}
              >
                <Plus aria-hidden />
                {labels.add}
              </Button>
            ) : null
          }
        >
          {labels.empty}
        </EmptyState>
      </div>
    );

  const item = (question: QuizEditorQuestion, index: number) => {
    const issues = questionIssues(question);
    const current = question.id === selected;
    return (
      <div
        className={cn(
          "group/rail flex items-center gap-1 rounded-(--r-card) pr-2 transition-colors",
          current ? "bg-canvas-deep" : "hover:bg-canvas-deep/60",
        )}
      >
        {sortable ? (
          <SortableItemHandle
            aria-label={say(labels.drag, { number: index + 1 })}
            className="flex size-8 shrink-0 items-center justify-center rounded text-ink-faint hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
          >
            <GripVertical
              aria-hidden
              className="size-4"
            />
          </SortableItemHandle>
        ) : (
          <span className="w-2 shrink-0" />
        )}
        <button
          type="button"
          aria-current={current ? "true" : undefined}
          onClick={() => setSelected(question.id)}
          className="grid min-h-12 min-w-0 flex-1 content-center gap-0.5 rounded py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <span className="text-xs text-ink-soft tabular-nums">
            {say(labels.number, { number: index + 1 })}
          </span>
          <span
            className={cn(
              "truncate text-2sm",
              question.prompt.trim() ? "text-ink" : "text-ink-faint",
              current && "font-medium",
            )}
          >
            {question.prompt.trim() || labels.untitled}
          </span>
        </button>
        {issues.length > 0 ? (
          <CircleAlert
            aria-label={labels.needsWork}
            className="size-3.5 shrink-0 text-red-ink"
          />
        ) : null}
      </div>
    );
  };

  return (
    <div
      aria-busy={pending}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:overflow-hidden"
    >
      <aside className="grid content-start gap-3 border-b border-line bg-paper p-3 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <h3 className="flex items-center justify-between px-2 pt-1 text-xs font-medium text-ink-soft">
          {labels.questions}
          <span className="tabular-nums">{questions.length}</span>
        </h3>
        {sortable ? (
          <Sortable
            value={order}
            onValueChange={(next) => {
              if (!sameOrder(next, order)) reorder(next, order);
            }}
          >
            <SortableContent
              render={<ol />}
              className="grid gap-1"
            >
              {shown.map((question, index) => (
                <SortableItem
                  key={question.id}
                  value={question.id}
                  render={<li />}
                >
                  {item(question, index)}
                </SortableItem>
              ))}
            </SortableContent>
          </Sortable>
        ) : (
          <ol className="grid gap-1">
            {shown.map((question, index) => (
              <li key={question.id}>{item(question, index)}</li>
            ))}
          </ol>
        )}
        {addButton}
        <p className="px-2 pb-1 text-xs text-pretty text-ink-soft">
          {labels.body}
        </p>
      </aside>
      <div className="min-w-0 p-4 sm:p-8 lg:overflow-y-auto">
        {active ? (
          <div className="w-full">
            <QuizEditorCard
              key={active.id}
              question={active}
              number={activeIndex + 1}
              editable={editable}
              sortable={false}
              language={language}
              labels={labels}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
