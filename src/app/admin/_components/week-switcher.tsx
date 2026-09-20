import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { calendarDate } from "@/lib/calendar";
import { formatShortDateWithWeekday, type Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { fill } from "@/lib/utils";
import { weekHref, weekNeighbours, weekParam } from "../week-param";

type Props = {
  pathname: string;
  scopeQuery: string;
  anchor: Date;
  timeZone: string;
  strings: Dictionary["calendar"];
  locale: Locale;
  now: Date;
};

/**
 * Prev / this week / next as plain links. Navigation, not state — so it
 * prefetches, works without JavaScript and survives a refresh.
 */
export function WeekSwitcher({
  pathname,
  scopeQuery,
  anchor,
  timeZone,
  strings,
  locale,
  now,
}: Props) {
  const { previous, next } = weekNeighbours(anchor, timeZone);
  const step = cn(
    buttonVariants({ variant: "outline", size: "icon" }),
    "size-8",
  );

  return (
    <div className="flex items-center gap-1.25">
      <Link
        href={weekHref(pathname, scopeQuery, previous)}
        className={step}
        aria-label={strings.previousWeek}
      >
        <ChevronLeft
          aria-hidden
          className="size-4"
        />
      </Link>
      <Link
        href={weekHref(pathname, scopeQuery, weekParam(now, timeZone))}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8",
        )}
      >
        {strings.today}
      </Link>
      <Link
        href={weekHref(pathname, scopeQuery, next)}
        className={step}
        aria-label={strings.nextWeek}
      >
        <ChevronRight
          aria-hidden
          className="size-4"
        />
      </Link>
      <p className="text-2sm text-ink-soft pl-2">
        {fill(strings.weekOf, {
          date: formatShortDateWithWeekday(
            calendarDate(anchor, timeZone),
            locale,
          ),
        })}
      </p>
    </div>
  );
}
