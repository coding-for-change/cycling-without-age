import {
  formatDayOfMonth,
  formatShortDateWithWeekday,
  formatWeekdayNarrow,
  type Locale,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  /** A calendar date (UTC midnight), as `calendarDate` returns it. */
  day: Date;
  locale: Locale;
  isToday: boolean;
};

/**
 * The head of a day column. Wide containers get the full "Mo., 14.09."; below
 * `@3xl` the seven columns share a phone, so the label stacks a weekday letter
 * over the day of month, the way native calendars do.
 */
export function DayHeading({ day, locale, isToday }: Props) {
  const full = formatShortDateWithWeekday(day, locale);

  return (
    <>
      <span
        className={cn(
          "text-2sm hidden @3xl:inline",
          isToday ? "text-ink font-display" : "text-ink-soft",
        )}
      >
        {full}
      </span>
      <span className="flex flex-col items-center gap-1 @3xl:hidden">
        <span
          aria-hidden
          className="text-2sm text-ink-soft"
        >
          {formatWeekdayNarrow(day, locale)}
        </span>
        <span
          aria-hidden
          className={cn(
            "text-ink flex size-7 items-center justify-center rounded-full text-base leading-none",
            isToday && "bg-mint font-semibold",
          )}
        >
          {formatDayOfMonth(day, locale)}
        </span>
        <span className="sr-only">{full}</span>
      </span>
    </>
  );
}
