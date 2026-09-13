"use client";

import { useId, useState, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { reportSave, type ActionResult } from "@/components/action-feedback";
import type { InlineFieldLabels } from "@/components/inline-field";
import { useSaveStatus } from "@/components/save-status";

/**
 * The three rows a settings list is made of — a switch, a select, and a slot
 * for an `InlineField`. Chapter settings and the account surface render the
 * same list, so the rows live here rather than in either one.
 *
 * `ToggleRow` and `SelectRow` autosave: the shown value is optimistic until the
 * server refresh catches up, then the prop takes over again, and `reportSave`
 * owns the toast, the Undo and the single haptic.
 */

export function ToggleRow({
  value,
  label,
  hint,
  labels,
  onSave,
}: {
  value: boolean;
  label: string;
  hint: string;
  labels: InlineFieldLabels;
  onSave: (next: boolean) => Promise<ActionResult>;
}) {
  const report = useSaveStatus();
  const id = useId();
  const [override, setOverride] = useState<{
    from: boolean;
    to: boolean;
  } | null>(null);

  // Optimistic until the server refresh catches up, then the prop takes over.
  const shown = override && override.from === value ? override.to : value;

  const persist = async (next: boolean, undoable: boolean) => {
    setOverride({ from: !next, to: next });
    report("saving");
    const ok = reportSave(await onSave(next), {
      report,
      labels,
      undo: undoable ? () => void persist(!next, false) : undefined,
    });
    if (!ok) setOverride(null);
  };

  return (
    <li className="flex min-h-11 items-start justify-between gap-5 py-3">
      <div className="grid gap-1">
        <span
          id={id}
          className="text-sm font-medium"
        >
          {label}
        </span>
        <span className="text-2sm text-ink-soft">{hint}</span>
      </div>
      <Switch
        aria-labelledby={id}
        checked={shown}
        onCheckedChange={(next) => void persist(next, true)}
        className="mt-1"
      />
    </li>
  );
}

export function SelectRow({
  value,
  label,
  hint,
  placeholder,
  options,
  labels,
  onSave,
}: {
  value: string | null;
  label: string;
  hint?: string;
  /** The empty choice. Picking it saves `null`. */
  placeholder?: string;
  options: readonly { value: string; label: string }[];
  labels: InlineFieldLabels;
  onSave: (next: string | null) => Promise<ActionResult>;
}) {
  const report = useSaveStatus();
  const id = useId();
  const [override, setOverride] = useState<{
    from: string | null;
    to: string | null;
  } | null>(null);

  const shown = override && override.from === value ? override.to : value;

  const persist = async (
    next: string | null,
    previous: string | null,
    undoable: boolean,
  ) => {
    setOverride({ from: previous, to: next });
    report("saving");
    const ok = reportSave(await onSave(next), {
      report,
      labels,
      undo: undoable ? () => void persist(previous, next, false) : undefined,
    });
    if (!ok) setOverride(null);
  };

  return (
    <li className="flex min-h-11 items-start justify-between gap-5 py-3">
      <div className="grid gap-1">
        <label
          htmlFor={id}
          className="text-sm font-medium"
        >
          {label}
        </label>
        {hint ? <span className="text-2sm text-ink-soft">{hint}</span> : null}
      </div>
      <div className="mt-1 shrink-0">
        <NativeSelect
          id={id}
          value={shown ?? ""}
          onChange={(event) => {
            const next = event.target.value === "" ? null : event.target.value;
            if (next === shown) return;
            void persist(next, shown, true);
          }}
        >
          {placeholder ? (
            <NativeSelectOption value="">{placeholder}</NativeSelectOption>
          ) : null}
          {options.map((option) => (
            <NativeSelectOption
              key={option.value}
              value={option.value}
            >
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </li>
  );
}

export function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <li className="grid gap-1 py-3">
      <span className="text-sm font-medium">{label}</span>
      {hint ? <span className="text-2sm text-ink-soft">{hint}</span> : null}
      {children}
    </li>
  );
}
