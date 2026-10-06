"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

export type Gender = "female" | "male" | "other";

const GENDERS: Gender[] = ["female", "male", "other"];

export function GenderChoice({
  legend,
  labels,
  value,
  onChange,
}: {
  legend: string;
  labels: Record<Gender, string>;
  value: Gender | null;
  onChange: (gender: Gender) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink-soft">
        {legend}
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {GENDERS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => {
              haptics.selectionChanged();
              onChange(option);
            }}
            className={cn(
              "rounded-(--r-card) border px-2 text-sm transition-colors",
              "min-h-12",
              "focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
              value === option
                ? "border-transparent bg-mint-tint font-medium text-ink ring-1 ring-mint"
                : "border-line bg-canvas text-ink-soft hover:bg-canvas-deep",
            )}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="mb-1.5 text-sm font-medium text-ink-soft"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
