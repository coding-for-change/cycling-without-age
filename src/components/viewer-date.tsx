"use client";

import type { Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { DateStyle } from "@/lib/instant-date";
import { useViewerDate } from "@/lib/viewer-time";

export function ViewerDate({
  value,
  notation,
  dateStyle = "short",
  template,
  language,
  className,
}: {
  value: string;
  notation: Locale;
  dateStyle?: DateStyle;
  template?: string;
  language?: string;
  className?: string;
}) {
  const date = useViewerDate(value, notation, dateStyle) ?? "";

  return (
    <time
      dateTime={value}
      suppressHydrationWarning
      className={className}
    >
      {template
        ? formatMessage(template, { date }, language ?? notation)
        : date}
    </time>
  );
}
