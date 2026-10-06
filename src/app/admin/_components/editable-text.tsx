"use client";

import type { ActionResult } from "@/components/action-feedback";
import { InlineField, type InlineFieldLabels } from "@/components/inline-field";
import { RichText } from "@/components/markdown";
import type { MarkdownToolLabels } from "@/components/markdown-editor";
import { cn } from "@/lib/utils";

export type EditableTextProps = {
  editable: boolean;
  value: string | null;
  label: string;
  placeholder: string;
  onSave: (next: string | null) => Promise<ActionResult>;
  labels: InlineFieldLabels;
  multiline?: boolean;
  markdown?: MarkdownToolLabels;
  maxLength?: number;
  className?: string;
};

export function EditableText({
  editable,
  value,
  label,
  placeholder,
  onSave,
  labels,
  multiline = false,
  markdown,
  maxLength,
  className,
}: EditableTextProps) {
  if (editable)
    return (
      <InlineField
        multiline={multiline || Boolean(markdown)}
        maxLength={maxLength}
        value={value}
        label={label}
        placeholder={placeholder}
        markdown={markdown}
        display={markdown ? (text) => <RichText text={text} /> : undefined}
        onSave={onSave}
        labels={labels}
        className={className ?? (markdown ? undefined : "text-2sm")}
      />
    );
  if (value && markdown) return <RichText text={value} />;
  return (
    <p
      className={cn(
        "text-2sm whitespace-pre-wrap break-words",
        !value && "text-ink-faint",
      )}
    >
      {value ?? placeholder}
    </p>
  );
}
