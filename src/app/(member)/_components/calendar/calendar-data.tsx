import type { ReactNode } from "react";
import { chapters } from "@/features/chapters";
import { dayKey } from "@/lib/calendar";
import type { Dictionary } from "@/lib/i18n";
import type { MemberCalendarStrings } from "./member-calendar";
import {
  byTime,
  gridRange,
  markersByDay,
  monthOf,
  monthWindow,
  nextBusyDay,
  parseMonth,
  type CalendarEntry,
} from "./month-grid";

export const WEEK_STARTS_ON = 1;
const FALLBACK_ZONE = "UTC";

export type AgendaEntry = CalendarEntry & { node: ReactNode };

export async function calendarFrame(
  chapterIds: string[],
  requestedMonth: string | null,
  now = new Date(),
) {
  const zones = await chapters.getChapterTimeZones([...new Set(chapterIds)]);
  const zone = zones[0]?.timeZone ?? FALLBACK_ZONE;
  const today = dayKey(now, zone);
  const month = parseMonth(requestedMonth) ?? monthOf(today);
  return { zone, today, month, now, ...monthWindow(month, zone) };
}

export const entryDay = (startsAt: Date, timeZone: string) =>
  dayKey(startsAt, timeZone);

export function calendarProps(
  entries: AgendaEntry[],
  month: string,
  today: string,
) {
  const { first, last } = gridRange(month, WEEK_STARTS_ON);
  const visible = entries
    .filter((entry) => entry.day >= first && entry.day <= last)
    .sort(byTime);

  const grouped: Record<string, ReactNode[]> = {};
  const counts: Record<string, number> = {};
  for (const entry of visible) {
    (grouped[entry.day] ??= []).push(entry.node);
    counts[entry.day] = (counts[entry.day] ?? 0) + 1;
  }

  return {
    markers: markersByDay(visible),
    counts,
    agenda: grouped as Record<string, ReactNode>,
    next: nextBusyDay(
      entries.filter((entry) => !entry.muted).map((entry) => entry.day),
      today,
    ),
  };
}

export const calendarStrings = (
  dict: Dictionary,
  book: string | null,
): MemberCalendarStrings => ({ ...dict.member.calendar, book });
