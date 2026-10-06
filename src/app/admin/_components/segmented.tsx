"use client";

import type { LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  title?: string;
  icon?: LucideIcon;
  iconOnly?: boolean;
};

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  wide = false,
  className,
}: {
  value: T | null;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  label: string;
  wide?: boolean;
  className?: string;
}) {
  const known = (next: string): next is T =>
    options.some((option) => option.value === next);

  return (
    <ToggleGroup
      type="single"
      value={value ?? ""}
      onValueChange={(next) => {
        if (known(next) && next !== value) onChange(next);
      }}
      aria-label={label}
      spacing={0.5}
      className={cn(
        "shrink-0 rounded-lg bg-canvas-deep p-0.5",
        wide && "grid w-full auto-cols-fr grid-flow-col",
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            title={option.title ?? option.label}
            aria-label={option.title ?? option.label}
            className={cn(
              "h-7 min-w-0 rounded-md px-2.5 text-xs font-medium text-ink-soft tabular-nums transition-[background-color,color,box-shadow] hover:bg-transparent hover:text-ink focus-visible:ring-2 focus-visible:ring-ink data-[state=on]:bg-canvas data-[state=on]:text-ink data-[state=on]:shadow-xs",
              Icon && "gap-1.5",
              wide && "h-9",
            )}
          >
            {Icon ? (
              <Icon
                aria-hidden
                className="size-3.5"
              />
            ) : null}
            {option.iconOnly && Icon ? null : option.label}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
