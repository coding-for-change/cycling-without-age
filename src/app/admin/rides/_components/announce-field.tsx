"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";

/** Whether a new event ride shows up for the chapter's riders to book. */
export function AnnounceField({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  const id = useId();
  const hintId = useId();
  return (
    <div className="flex min-h-9 items-start gap-3 px-2 py-1">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={hintId}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <label
          htmlFor={id}
          className="text-2sm font-medium"
        >
          {label}
        </label>
        <p
          id={hintId}
          className="text-ink-soft text-xs"
        >
          {hint}
        </p>
      </div>
    </div>
  );
}
