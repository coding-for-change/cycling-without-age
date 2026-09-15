"use client";

import { useId, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { ActionResult } from "@/components/action-feedback";
import type { InlineFieldLabels } from "@/components/inline-field";
import { useOptimisticSave } from "@/components/use-optimistic-save";

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
  const id = useId();
  const { shown, persist } = useOptimisticSave(
    value,
    (next) => onSave(next),
    labels,
  );

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
        onCheckedChange={(next) => void persist(next, !next)}
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
  placeholder?: string;
  options: readonly { value: string; label: string }[];
  labels: InlineFieldLabels;
  onSave: (next: string | null) => Promise<ActionResult>;
}) {
  const id = useId();
  const { shown, persist } = useOptimisticSave(
    value,
    (next) => onSave(next),
    labels,
  );

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
            void persist(next, shown);
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
