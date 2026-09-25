import "server-only";
import { rides } from "@/features/rides";
import { addDays, firstDayOfWeek, startOfWeek } from "@/lib/calendar";
import { resolveLocale } from "@/lib/format";
import { calendarTimeZone } from "./calendar-scope";
import { readWeekAnchor } from "./week-param";

export async function readCalendarWeek({
  week,
  zones,
  head,
  chapterIds,
}: {
  week: string | string[] | undefined;
  zones: Parameters<typeof calendarTimeZone>[0];
  head: { get(name: string): string | null };
  chapterIds: string[];
}) {
  const locale = resolveLocale(head.get("accept-language"));
  const weekStartsOn = firstDayOfWeek(locale);
  const { timeZone, label } = calendarTimeZone(zones);
  const now = new Date();
  const anchor = readWeekAnchor(week, timeZone, weekStartsOn, now);
  const weekStart = startOfWeek(anchor, timeZone, weekStartsOn);
  const weekRides = await rides.listRidesInRange(
    chapterIds,
    weekStart,
    addDays(weekStart, 7, timeZone),
  );
  return {
    locale,
    weekStartsOn,
    timeZone,
    label,
    now,
    anchor,
    rides: weekRides,
  };
}
