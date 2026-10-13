"use client";

import { Minus, Plus } from "lucide-react";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

const STEP_BUTTON =
  "inline-flex h-full w-9 items-center justify-center text-ink-soft transition-colors first:rounded-l-lg last:rounded-r-lg hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

export function CountStepper({
  value,
  min,
  max,
  onChange,
  label,
  fewer,
  more,
  className,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  fewer: string;
  more: string;
  className?: string;
}) {
  const step = (by: number) => {
    onChange(value + by);
    haptics.selectionChanged();
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-fit items-center rounded-lg border border-line text-2sm",
        className,
      )}
    >
      <button
        type="button"
        aria-label={fewer}
        disabled={value <= min}
        onClick={() => step(-1)}
        className={STEP_BUTTON}
      >
        <Minus
          aria-hidden
          className="size-3.5"
        />
      </button>
      <span
        aria-live="polite"
        className="min-w-8 text-center tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={more}
        disabled={value >= max}
        onClick={() => step(1)}
        className={STEP_BUTTON}
      >
        <Plus
          aria-hidden
          className="size-3.5"
        />
      </button>
    </div>
  );
}
