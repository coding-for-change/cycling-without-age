"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ToggleChip({
  pressed,
  onToggle,
  disabled,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.25 rounded-full border px-3 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 motion-reduce:transition-none",
        pressed
          ? "border-mint bg-mint text-ink"
          : "border-line bg-paper hover:bg-canvas-deep",
      )}
    >
      {children}
    </button>
  );
}
