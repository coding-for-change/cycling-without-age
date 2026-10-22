import { calendarDate, dayKey } from "@/lib/calendar";
import { formatDate, type Locale } from "@/lib/format";

export const messageDayKey = (iso: string, timeZone: string) =>
  dayKey(new Date(iso), timeZone);

export const formatMessageDay = (
  iso: string,
  notation: Locale,
  timeZone: string,
) => formatDate(calendarDate(new Date(iso), timeZone), notation);
