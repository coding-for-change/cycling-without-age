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
  return (
    <div className="flex min-h-9 items-center gap-3 px-2">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
      />
      <label
        htmlFor={id}
        className="text-2sm font-medium"
        title={hint}
      >
        {label}
      </label>
      <span className="text-2sm text-ink-soft truncate max-sm:hidden">
        {hint}
      </span>
    </div>
  );
}
