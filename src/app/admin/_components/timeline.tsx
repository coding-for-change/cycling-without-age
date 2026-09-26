import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const payloadStrings = (payload: unknown): Record<string, string> =>
  payload && typeof payload === "object" && !Array.isArray(payload)
    ? Object.fromEntries(
        Object.entries(payload).filter(
          ([, value]) => typeof value === "string",
        ),
      )
    : {};

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
