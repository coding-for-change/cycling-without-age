import { Children, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const asText = (value: unknown) =>
  typeof value === "string" ? value : "";

export const payloadStrings = (payload: unknown): Record<string, string> =>
  Object.fromEntries(
    Object.entries(asRecord(payload)).filter(
      ([, value]) => typeof value === "string",
    ),
  ) as Record<string, string>;

export function TimelineList({
  empty,
  children,
}: {
  empty: string;
  children: ReactNode;
}) {
  if (Children.count(children) === 0)
    return <p className="text-2sm text-ink-soft">{empty}</p>;
  return <ol>{children}</ol>;
}

export function TimelineHeadline({
  sentence,
  at,
  notation,
  words,
  now,
}: {
  sentence: ReactNode;
  at: Date;
  notation: Locale;
  words: string;
  now: Date;
}) {
  return (
    <p className="text-2sm text-ink-soft">
      <span className="text-ink">{sentence}</span>
      {" · "}
      <RelativeTime
        at={at}
        notation={notation}
        words={words}
        now={now}
      />
    </p>
  );
}

export function TimelineBubble({
  tone = "note",
  children,
}: {
  tone?: "note" | "muted";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-xl px-3 py-2 text-2sm break-words",
        tone === "note"
          ? "bg-mint-tint whitespace-pre-wrap text-ink"
          : "bg-canvas-deep text-ink-soft",
      )}
    >
      {children}
    </p>
  );
}

export function TimelineEntry({
  icon: Icon,
  iconClassName,
  marker,
  children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  marker?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="group flex gap-2">
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span className="flex h-5 items-center">
          {marker ?? (
            <Icon
              aria-hidden
              className={cn("size-3.5 text-ink-soft", iconClassName)}
            />
          )}
        </span>
        <span
          aria-hidden
          className="w-px flex-1 bg-line group-last:hidden"
        />
      </div>
      <div className="grid min-w-0 flex-1 gap-2 pb-3 group-last:pb-0">
        {children}
      </div>
    </li>
  );
}

export function RelativeTime({
  at,
  notation,
  words,
  now,
}: {
  at: Date;
  notation: Locale;
  words: string;
  now: Date;
}) {
  return (
    <time
      dateTime={at.toISOString()}
      title={formatDate(at, notation)}
    >
      {formatRelativeTime(at, wordsLocale(words), now)}
    </time>
  );
}
