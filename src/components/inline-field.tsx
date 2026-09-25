"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/components/action-feedback";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import {
  MarkdownEditor,
  type MarkdownToolLabels,
} from "@/components/markdown-editor";

export type InlineFieldLabels = {
  edit: string;
  saved: string;
  undo: string;
  undone: string;
  invalid: string;
  errors: { generic: string } & Record<string, string>;
};

type Value = string | null;

export function InlineField({
  value,
  label,
  placeholder,
  multiline = false,
  maxLength,
  required = false,
  type = "text",
  max,
  inputMode,
  validate,
  display,
  onSave,
  labels,
  markdown,
  compact = false,
  className,
  inputClassName,
}: {
  value: Value;
  label: string;
  placeholder: string;
  multiline?: boolean;
  maxLength?: number;
  required?: boolean;
  type?: "text" | "url" | "email" | "date";
  max?: string;
  inputMode?: "text" | "url" | "email";
  validate?: (next: string) => boolean;
  display?: (value: string) => ReactNode;
  onSave: (next: Value, previous: Value) => Promise<ActionResult>;
  labels: InlineFieldLabels;
  markdown?: MarkdownToolLabels;
  compact?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelled = useRef(false);
  const { shown, persist } = useOptimisticSave(value, onSave, labels);

  const open = () => {
    setDraft(shown ?? "");
    setEditing(true);
  };

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const trimmed = draft.trim();
    const next: Value = trimmed === "" ? null : trimmed;
    if (next === null && required) {
      haptics.warning();
      setEditing(false);
      return;
    }
    if (next !== null && validate && !validate(next)) {
      haptics.warning();
      toast.error(labels.invalid);
      return;
    }
    setEditing(false);
    if (next === shown) return;
    void persist(next, shown);
  };

  const cancel = () => {
    cancelled.current = true;
    setEditing(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key !== "Enter") return;
    if (multiline && !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    commit();
  };

  if (editing) {
    const inputClass = cn("border-line text-base", inputClassName);
    const shared = {
      id,
      "aria-label": label,
      value: draft,
      maxLength,
      autoFocus: true,
      onChange: (event: { target: { value: string } }) =>
        setDraft(event.target.value),
      onBlur: commit,
      onKeyDown,
      // A date input has no text to select, and asking for it throws.
      onFocus:
        type === "date"
          ? undefined
          : (event: { target: { select: () => void } }) =>
              event.target.select(),
    };
    return (
      <div className={cn("grid gap-1", className)}>
        {markdown ? (
          <MarkdownEditor
            id={id}
            aria-label={label}
            value={draft}
            maxLength={maxLength}
            autoFocus
            labels={markdown}
            placeholder={placeholder}
            onChange={setDraft}
            onBlur={commit}
            onKeyDown={onKeyDown}
            className={inputClassName}
          />
        ) : multiline ? (
          <Textarea
            {...shared}
            rows={3}
            className={inputClass}
          />
        ) : (
          <Input
            {...shared}
            type={type}
            max={max}
            inputMode={inputMode}
            autoComplete="off"
            className={cn(compact ? "h-8 text-2sm" : "h-11", inputClass)}
          />
        )}
        {maxLength ? (
          <span className="justify-self-end text-xs tabular-nums text-ink-faint">
            {draft.length} / {maxLength}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`${labels.edit}: ${label}`}
      className={cn(
        "group/inline -mx-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-(--r-card) px-2 text-left transition-colors",
        compact ? "min-h-8 py-1.5" : "min-h-11 py-2",
        "hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
        className,
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1 text-pretty whitespace-pre-wrap break-words",
          shown === null && "text-ink-faint",
        )}
      >
        {shown === null ? placeholder : display ? display(shown) : shown}
      </span>
      <Pencil
        aria-hidden
        className={cn(
          "size-3.5 shrink-0 text-ink-faint transition group-hover/inline:text-ink group-focus-visible/inline:text-ink",
          compact
            ? "mt-0.5 opacity-0 group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100 pointer-coarse:opacity-100"
            : "mt-1",
        )}
      />
    </button>
  );
}
