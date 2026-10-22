import { calendarDate } from "@/lib/calendar";
import {
  formatDayMonthShort,
  formatTime,
  formatWeekday,
  type Locale,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";

export function dayAndTime(
  template: string,
  startsAt: Date,
  timeZone: string,
  notation: Locale,
  words: Locale,
) {
  const day = calendarDate(startsAt, timeZone);
  return formatMessage(
    template,
    {
      weekday: formatWeekday(day, notation, "short"),
      date: formatDayMonthShort(day, notation),
      time: formatTime(startsAt, notation, timeZone),
    },
    words,
  );
}
