"use client";

import type { ActionResult } from "@/components/action-feedback";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { cn } from "@/lib/utils";
import { DETAIL_TITLE } from "./detail-page";

export function DetailTitle({
  value,
  label,
  maxLength,
  onSave,
  labels,
}: {
  value: string;
  label: string;
  maxLength?: number;
  onSave?: (next: string) => Promise<ActionResult>;
  labels: InlineFieldLabels;
}) {
  if (!onSave) return <span className={DETAIL_TITLE}>{value}</span>;
  return (
    <InlineField
      required
      maxLength={maxLength}
      value={value}
      label={label}
      placeholder={label}
      onSave={(next) => onSave(next ?? value)}
      labels={labels}
      className={cn("-my-1 min-h-0 py-1", DETAIL_TITLE)}
      inputClassName={cn("h-12", DETAIL_TITLE)}
    />
  );
}
