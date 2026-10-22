import type { ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { calendarDate } from "@/lib/calendar";
import {
  formatLongDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";

export function EventHeader({
  eyebrow,
  title,
  startsAt,
  endsAt,
  timeZone,
  locale,
  after,
}: {
  eyebrow: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  locale: Locale;
  after?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1.25">
      <p className="text-2sm font-medium text-ink-soft">{eyebrow}</p>
      <h1 className="text-2xl tracking-tight md:text-3xl">{title}</h1>
      <p className="flex items-start gap-1.25 text-ink-soft">
        <CalendarClock
          aria-hidden
          className="mt-1 size-4 shrink-0"
        />
        <span>
          {formatLongDateWithWeekday(calendarDate(startsAt, timeZone), locale)}
          {" · "}
          <time
            dateTime={startsAt.toISOString()}
            className="tabular-nums"
          >
            {formatTimeRange(startsAt, endsAt, locale, timeZone)}
          </time>
          {after}
        </span>
      </p>
    </header>
  );
}
