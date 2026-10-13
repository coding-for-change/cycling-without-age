import { clockMinutes, dayKey, MINUTES_IN_DAY, type Span } from "./calendar";

export type HoursWindow = {
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export type OperatingHours = {
  windows: readonly HoursWindow[];
  closures: readonly string[];
};

export type MinuteRange = { from: number; to: number };

export type HoursFit = "open" | "outsideHours" | "closed" | "unconfigured";

export const NO_HOURS: OperatingHours = { windows: [], closures: [] };

export function isoWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export const isConfigured = (hours: OperatingHours) => hours.windows.length > 0;

export const isClosedOn = (hours: OperatingHours, date: string) =>
  hours.closures.includes(date);

export function windowsOn(hours: OperatingHours, date: string): MinuteRange[] {
  if (isClosedOn(hours, date)) return [];
  const weekday = isoWeekday(date);
  return hours.windows
    .filter((window) => window.weekday === weekday)
    .map((window) => ({ from: window.startMinute, to: window.endMinute }))
    .toSorted((a, b) => a.from - b.from);
}

export function fitsHours(
  hours: OperatingHours,
  span: Span,
  timeZone: string,
): HoursFit {
  const date = dayKey(span.startsAt, timeZone);
  if (isClosedOn(hours, date)) return "closed";
  if (!isConfigured(hours)) return "unconfigured";
  const windows = windowsOn(hours, date);
  if (!windows.length) return "closed";
  const endMinute = clockMinutes(span.endsAt, timeZone);
  const sameDay = dayKey(span.endsAt, timeZone) === date;
  if (!sameDay && endMinute !== 0) return "outsideHours";
  const from = clockMinutes(span.startsAt, timeZone);
  const to = sameDay ? endMinute : MINUTES_IN_DAY;
  return windows.some((window) => from >= window.from && to <= window.to)
    ? "open"
    : "outsideHours";
}

export function closedRanges(
  hours: OperatingHours,
  date: string,
): MinuteRange[] {
  if (isClosedOn(hours, date)) return [{ from: 0, to: MINUTES_IN_DAY }];
  if (!isConfigured(hours)) return [];
  const closed: MinuteRange[] = [];
  let cursor = 0;
  for (const window of windowsOn(hours, date)) {
    if (window.from > cursor) closed.push({ from: cursor, to: window.from });
    cursor = Math.max(cursor, window.to);
  }
  if (cursor < MINUTES_IN_DAY)
    closed.push({ from: cursor, to: MINUTES_IN_DAY });
  return closed;
}

export function openingBand(hours: OperatingHours): MinuteRange | null {
  if (!isConfigured(hours)) return null;
  return {
    from: Math.min(...hours.windows.map((window) => window.startMinute)),
    to: Math.max(...hours.windows.map((window) => window.endMinute)),
  };
}
