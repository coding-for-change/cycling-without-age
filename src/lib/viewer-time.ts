import { useSyncExternalStore } from "react";
import { dayKey } from "./calendar";
import { formatInstantDate, type DateStyle } from "./instant-date";
import { formatRelativeTime, wordsLocale, type Locale } from "./format";

const noop = () => () => {};

export const useMounted = (): boolean =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

export const deviceTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export const useViewerTimeZone = (): string =>
  useMounted() ? deviceTimeZone() : "UTC";

export const useViewerToday = (): string =>
  dayKey(new Date(), useViewerTimeZone());

export const useViewerDate = (
  value: Date | string | null,
  notation: Locale,
  style: DateStyle = "short",
): string | null => {
  const timeZone = useViewerTimeZone();
  return value === null
    ? null
    : formatInstantDate(value, notation, timeZone, style);
};

const TICK_MS = 30_000;
const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribeToClock(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size || !timer) return;
    clearInterval(timer);
    timer = undefined;
  };
}

export const useNow = (): number | null =>
  useSyncExternalStore(
    subscribeToClock,
    () => now,
    () => null,
  );

export const useRelativeTime = (
  value: Date | string,
  words: string,
): string | null => {
  const tick = useNow();
  return tick === null
    ? null
    : formatRelativeTime(value, wordsLocale(words), new Date(tick));
};
