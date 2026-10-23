import type { ReactNode } from "react";
import { calendarDate } from "@/lib/calendar";
import {
  formatLongDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";

export function PersonalHeader({
  badge,
  title,
  startsAt,
  endsAt,
  timeZone,
  locale,
  after,
  children,
}: {
  badge?: ReactNode;
  title: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  locale: Locale;
  after?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1.25">
      {badge}
      <h1 className="text-2xl tracking-tight md:text-3xl">{title}</h1>
      <p className="text-ink-soft">
        {formatLongDateWithWeekday(calendarDate(startsAt, timeZone), locale)}
        {" · "}
        <time
          dateTime={startsAt.toISOString()}
          className="tabular-nums"
        >
          {formatTimeRange(startsAt, endsAt, locale, timeZone)}
        </time>
        {after}
      </p>
      {children}
    </header>
  );
}
