import { instantAt } from "@/lib/calendar";

export type MarkerKind = "mine" | "join" | "pending";

export type CalendarEntry = {
  id: string;
  day: string;
  at: number;
  kind: MarkerKind;
  muted?: boolean;
};

export type GridDay = { key: string; day: number; inMonth: boolean };

export const MARKER_LIMIT = 3;
export const WINDOW_PAD_DAYS = 7;

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const KIND_ORDER: Record<MarkerKind, number> = { mine: 0, join: 1, pending: 2 };

const pad = (value: number) => String(value).padStart(2, "0");

const isoDay = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const isoMonth = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;

const parts = (month: string) => {
  const [year, index] = month.split("-").map(Number);
  return { year, index };
};

export function parseMonth(value: string | null | undefined): string | null {
  return value && MONTH.test(value) ? value : null;
}

export function parseDay(value: string | null | undefined): string | null {
  const match = value ? DAY.exec(value) : null;
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return isoDay(date) === value ? value : null;
}

export const monthOf = (day: string) => day.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const { year, index } = parts(month);
  return isoMonth(new Date(Date.UTC(year, index - 1 + delta, 1)));
}

export function monthGrid(month: string, weekStartsOn = 1): GridDay[][] {
  const { year, index } = parts(month);
  const first = new Date(Date.UTC(year, index - 1, 1));
  const lead = (first.getUTCDay() - weekStartsOn + 7) % 7;
  const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const cells = Math.ceil((lead + length) / 7) * 7;
  const days = Array.from({ length: cells }, (_, cell) => {
    const date = new Date(Date.UTC(year, index - 1, 1 - lead + cell));
    return {
      key: isoDay(date),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === index - 1,
    };
  });
  return Array.from({ length: cells / 7 }, (_, week) =>
    days.slice(week * 7, week * 7 + 7),
  );
}

export function gridRange(month: string, weekStartsOn = 1) {
  const weeks = monthGrid(month, weekStartsOn);
  return { first: weeks[0][0].key, last: weeks[weeks.length - 1][6].key };
}

export function monthWindow(
  month: string,
  timeZone: string,
  padDays = WINDOW_PAD_DAYS,
) {
  const { year, index } = parts(month);
  return {
    from: instantAt(
      { year, month: index, day: 1 - padDays, hour: 0, minute: 0 },
      timeZone,
    ),
    to: instantAt(
      { year, month: index + 1, day: 1 + padDays, hour: 0, minute: 0 },
      timeZone,
    ),
  };
}

export const byKindThenTime = (a: CalendarEntry, b: CalendarEntry) =>
  KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
  a.at - b.at ||
  a.id.localeCompare(b.id);

export const byTime = (a: CalendarEntry, b: CalendarEntry) =>
  a.at - b.at ||
  KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
  a.id.localeCompare(b.id);

export function markersByDay(
  entries: CalendarEntry[],
  limit = MARKER_LIMIT,
): Record<string, MarkerKind[]> {
  const markers: Record<string, MarkerKind[]> = {};
  for (const entry of [...entries].sort(byKindThenTime)) {
    if (entry.muted) continue;
    const day = (markers[entry.day] ??= []);
    if (day.length < limit) day.push(entry.kind);
  }
  return markers;
}

export function nextBusyDay(
  days: Iterable<string>,
  after: string,
): string | null {
  let next: string | null = null;
  for (const day of days) if (day > after && (!next || day < next)) next = day;
  return next;
}

export function selectDay({
  requested,
  month,
  today,
}: {
  requested: string | null;
  month: string;
  today: string;
}): string {
  const day = parseDay(requested);
  if (day && monthOf(day) === month) return day;
  if (monthOf(today) === month) return today;
  return `${month}-01`;
}
