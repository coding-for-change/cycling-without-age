"use client";

import { useSyncExternalStore } from "react";
import { formatRelativeTime, wordsLocale, type Locale } from "@/lib/format";

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatter = (notation: Locale) => {
  let found = formatters.get(notation);
  if (!found) {
    found = new Intl.DateTimeFormat(notation, {
      hour: "numeric",
      minute: "2-digit",
    });
    formatters.set(notation, found);
  }
  return found;
};

const noop = () => () => {};

export const useMounted = (): boolean =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

export function LocalTime({
  value,
  notation,
  className,
}: {
  value: string;
  notation: Locale;
  className?: string;
}) {
  const mounted = useMounted();

  return (
    <time
      dateTime={value}
      suppressHydrationWarning
      className={className}
    >
      {mounted ? formatter(notation).format(new Date(value)) : ""}
    </time>
  );
}

export function RelativeTime({
  value,
  words,
  title,
  className,
}: {
  value: string;
  words: string;
  title?: string;
  className?: string;
}) {
  const mounted = useMounted();

  return (
    <time
      dateTime={value}
      title={title}
      suppressHydrationWarning
      className={className}
    >
      {mounted ? formatRelativeTime(value, wordsLocale(words)) : ""}
    </time>
  );
}
