"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { HighlightedTextarea } from "./highlighted-textarea";
import { MarkdownToolbar } from "./toolbar";
import { useMarkdownTools, type MarkdownToolLabels } from "./tools";

const FIELD =
  "w-full resize-none px-3 py-2 text-base leading-relaxed whitespace-pre-wrap break-words md:text-2sm";

export function MarkdownEditor({
  id,
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  labels,
  maxLength,
  minRows = 3,
  autoFocus,
  toolbar = "bottom",
  className,
  areaClassName,
  fieldClassName,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  labels: MarkdownToolLabels;
  maxLength?: number;
  minRows?: number;
  autoFocus?: boolean;
  toolbar?: "top" | "bottom";
  className?: string;
  areaClassName?: string;
  fieldClassName?: string;
  "aria-label"?: string;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const { run, shortcut } = useMarkdownTools(
    field,
    value,
    onChange,
    labels.link,
  );

  const tools = (
    <div
      className={cn(
        "flex items-center gap-0.5 border-line px-1 py-1",
        toolbar === "top"
          ? "flex-wrap rounded-t-[calc(var(--r-card)-1px)] border-b bg-canvas-deep px-2"
          : "border-t",
      )}
    >
      <MarkdownToolbar
        labels={labels}
        run={run}
        size={toolbar === "top" ? "icon-sm" : "icon-xs"}
      />
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-(--r-card) border border-line bg-canvas transition-colors focus-within:border-ink-soft focus-within:ring-[3px] focus-within:ring-ring/30",
        className,
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          onBlur?.();
      }}
    >
      {toolbar === "top" ? tools : null}
      <HighlightedTextarea
        ref={field}
        id={id}
        value={value}
        onChange={onChange}
        rows={minRows}
        maxLength={maxLength}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (shortcut(event)) return;
          onKeyDown?.(event);
        }}
        fieldClassName={cn(FIELD, fieldClassName)}
        className={cn("block max-h-80 outline-none", areaClassName)}
      />
      {toolbar === "bottom" ? tools : null}
    </div>
  );
}
