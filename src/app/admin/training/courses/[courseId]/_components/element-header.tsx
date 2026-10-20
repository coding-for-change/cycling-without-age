"use client";

import type { ReactNode } from "react";
import { BookOpen, ChevronRight, ListChecks, X } from "lucide-react";
import {
  ConfirmDeleteDialog,
  type ConfirmDeleteLabels,
} from "@/components/confirm-delete-dialog";
import { SaveStatus } from "@/components/save-status";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { deleteElementAction } from "@/features/training/actions";
import type { Locale } from "@/lib/i18n/locales";
import { useCloseElement } from "./element-modal";

export type ElementHeaderLabels = {
  kind: string;
  trail: string;
  close: string;
  cancel: string;
  save: { saving: string; saved: string };
  delete: ConfirmDeleteLabels;
};

export function ElementHeader({
  elementId,
  kind,
  courseTitle,
  title,
  canManage,
  language,
  labels,
  children,
}: {
  elementId: string;
  kind: "lesson" | "quiz";
  courseTitle: string;
  title: string;
  canManage: boolean;
  language: Locale;
  labels: ElementHeaderLabels;
  children?: ReactNode;
}) {
  const close = useCloseElement();
  const Icon = kind === "quiz" ? ListChecks : BookOpen;

  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint-tint text-ink"
        title={labels.kind}
      >
        <Icon
          aria-hidden
          className="size-4"
        />
        <span className="sr-only">{labels.kind}</span>
      </span>
      <nav
        aria-label={labels.trail}
        className="min-w-0 flex-1"
      >
        <ol className="flex min-w-0 items-center gap-1.25 text-2sm">
          <li className="max-w-[45%] min-w-0 shrink-0 max-sm:hidden">
            <button
              type="button"
              onClick={close}
              className="block max-w-full truncate rounded text-ink-soft outline-none hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-ink"
            >
              {courseTitle}
            </button>
          </li>
          <li
            aria-hidden
            className="shrink-0 text-ink-faint max-sm:hidden"
          >
            <ChevronRight className="size-3.5" />
          </li>
          <li className="min-w-0">
            <DialogTitle className="truncate text-2sm font-semibold text-ink">
              {title || " "}
            </DialogTitle>
          </li>
        </ol>
      </nav>
      <SaveStatus
        labels={labels.save}
        words={language}
        className="shrink-0 max-md:hidden"
      />
      {children}
      {canManage ? (
        <ConfirmDeleteDialog
          variant="icon"
          name={title}
          locale={language}
          labels={labels.delete}
          cancel={labels.cancel}
          action={deleteElementAction}
          input={elementId}
          onDone={close}
        />
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={labels.close}
        title={labels.close}
        onClick={close}
        className="size-10 shrink-0 rounded-full text-ink-soft hover:text-ink"
      >
        <X aria-hidden />
      </Button>
    </header>
  );
}
