"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { ActionResult, SaveLabels } from "@/components/action-feedback";
import { Switch } from "@/components/ui/switch";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import { PropertySelect } from "./properties";

export function OptimisticPropertySelect<V extends string>({
  id,
  value,
  options,
  onSave,
  intercept,
  display,
  labels,
}: {
  id?: string;
  value: V;
  options: { value: V; label: string }[];
  onSave: (next: V) => Promise<ActionResult>;
  intercept?: (next: V) => boolean;
  display?: (value: V) => ReactNode;
  labels: SaveLabels;
}) {
  const { shown, persist } = useOptimisticSave(value, onSave, labels);
  return (
    <PropertySelect
      id={id}
      value={shown}
      options={options}
      display={display}
      onChange={(next) => {
        if (next === shown || intercept?.(next)) return;
        void persist(next, shown);
      }}
    />
  );
}

export function PropertySwitch({
  id,
  value,
  label,
  icon: Icon,
  onSave,
  labels,
}: {
  id?: string;
  value: boolean;
  label: string;
  icon?: LucideIcon;
  onSave: (next: boolean) => Promise<ActionResult>;
  labels: SaveLabels;
}) {
  const { shown, persist } = useOptimisticSave(value, onSave, labels);
  return (
    <div className="flex h-8 items-center gap-2">
      {Icon ? (
        <Icon
          aria-hidden
          className="size-3.5 text-ink-soft"
        />
      ) : null}
      <Switch
        id={id}
        size="sm"
        aria-label={label}
        checked={shown}
        onCheckedChange={(next) => void persist(next, !next)}
      />
    </div>
  );
}
