import { MINUTES_IN_DAY } from "./calendar";
import { formatTime, formatTimeRange, type Locale } from "./format";

export const CLOCK_STEP_MINUTES = 15;
export const DEFAULT_SLOT_MINUTES = 60;

const pad = (n: number) => String(n).padStart(2, "0");

const wrap = (minutes: number) =>
  ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;

export const clockToMinutes = (clock: string) => {
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
};

export const minutesToClock = (minutes: number) => {
  const wrapped = wrap(minutes);
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
};

const clockInstant = (minutes: number) =>
  new Date(Date.UTC(1970, 0, 1, 0, wrap(minutes)));

export const clockLabel = (minutes: number, locale: Locale) =>
  formatTime(clockInstant(minutes), locale, "UTC");

export const clockRangeLabel = (from: number, to: number, locale: Locale) =>
  formatTimeRange(clockInstant(from), clockInstant(to), locale, "UTC");

export const CLOCK_STEPS = Array.from(
  { length: MINUTES_IN_DAY / CLOCK_STEP_MINUTES },
  (_, index) => index * CLOCK_STEP_MINUTES,
);
