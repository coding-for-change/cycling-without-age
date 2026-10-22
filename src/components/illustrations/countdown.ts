import { calendarDate } from "@/lib/calendar";
import { formatMonthName, formatWeekday, type Locale } from "@/lib/format";

export type Countdown =
  | { kind: "past" }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "days"; days: number };

const DAY_MS = 86_400_000;

export function daysBetween(
  now: Date | string,
  startsAt: Date | string,
  timeZone: string,
): number {
  const from = calendarDate(new Date(now), timeZone).getTime();
  const to = calendarDate(new Date(startsAt), timeZone).getTime();
  return Math.round((to - from) / DAY_MS);
}

export function countdownOf(
  now: Date | string,
  startsAt: Date | string,
  timeZone: string,
): Countdown {
  const days = daysBetween(now, startsAt, timeZone);
  if (days < 0) return { kind: "past" };
  if (days === 0) return { kind: "today" };
  if (days === 1) return { kind: "tomorrow" };
  return { kind: "days", days };
}

export type DayParts = { weekday: string; day: string; month: string };

const bare = (label: string) => label.replace(/\.$/, "");

export function dayParts(
  instant: Date | string,
  timeZone: string,
  locale: Locale,
): DayParts {
  const date = calendarDate(new Date(instant), timeZone);
  return {
    weekday: bare(formatWeekday(date, locale, "short")),
    day: String(date.getUTCDate()),
    month: bare(formatMonthName(date, locale, "short")),
  };
}
