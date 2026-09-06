"use client";

import { useRouter } from "next/navigation";
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
import { useSaveStatus } from "./save-status";
import type { ActionResult } from "./action-feedback";

export type InlineFieldLabels = {
  edit: string;
  saved: string;
  undo: string;
  undone: string;
  invalid: string;
  errors: { generic: string } & Record<string, string>;
};

type Value = string | null;

/**
 * A value that turns into its own input when clicked. Enter (⌘↵ in a
 * textarea) or leaving the field saves, Escape puts the old value back, and
 * every save comes with an Undo in its toast. The shown value is optimistic
 * until the server refresh catches up, then the prop takes over again.
 */
export function InlineField({
  value,
  label,
  placeholder,
  multiline = false,
  maxLength,
  required = false,
  type = "text",
  inputMode,
  validate,
  display,
  onSave,
  labels,
  className,
  inputClassName,
}: {
  value: Value;
  label: string;
  placeholder: string;
  multiline?: boolean;
  maxLength?: number;
  /** An emptied required field is put back rather than saved as nothing. */
  required?: boolean;
  type?: "text" | "url";
  inputMode?: "text" | "url";
  validate?: (next: string) => boolean;
  display?: (value: string) => ReactNode;
  onSave: (next: Value, previous: Value) => Promise<ActionResult>;
  labels: InlineFieldLabels;
  className?: string;
  inputClassName?: string;
}) {
  const router = useRouter();
  const report = useSaveStatus();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [override, setOverride] = useState<{ from: Value; to: Value } | null>(
    null,
  );
  const cancelled = useRef(false);

  // The optimistic value holds only while the server still shows what we
  // replaced; once the refresh lands, `value` is the truth again.
  const shown = override && override.from === value ? override.to : value;

  const open = () => {
    setDraft(shown ?? "");
    setEditing(true);
  };

  const persist = async (next: Value, previous: Value, undoLabel: string) => {
    setOverride({ from: previous, to: next });
    report("saving");
    const result = await onSave(next, previous);
    if (!result.ok) {
      setOverride(null);
      report("failed");
      haptics.error();
      toast.error(labels.errors[result.error] ?? labels.errors.generic);
      return;
    }
    report("saved");
    haptics.success();
    toast.success(undoLabel, {
      action:
        undoLabel === labels.saved
          ? {
              label: labels.undo,
              onClick: () => void persist(previous, next, labels.undone),
            }
          : undefined,
    });
    router.refresh();
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
    void persist(next, shown, labels.saved);
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
      onFocus: (event: { target: { select: () => void } }) =>
        event.target.select(),
    };
    return (
      <div className={cn("grid gap-1", className)}>
        {multiline ? (
          <Textarea
            {...shared}
            rows={3}
            className={inputClass}
          />
        ) : (
          <Input
            {...shared}
            type={type}
            inputMode={inputMode}
            autoComplete="off"
            className={cn("h-11", inputClass)}
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
        "group/inline -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-start gap-2 rounded-(--r-card) px-2 py-2 text-left transition-colors",
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
        className="mt-1 size-3.5 shrink-0 text-ink-faint transition-colors group-hover/inline:text-ink group-focus-visible/inline:text-ink"
      />
    </button>
  );
}
