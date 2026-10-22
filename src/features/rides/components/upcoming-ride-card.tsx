import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  CalendarTile,
  type CalendarTileLabels,
} from "@/components/illustrations/calendar-tile";
import type { Locale } from "@/lib/format";
import { cn } from "@/lib/utils";

export type UpcomingRideCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  when: string;
  state?: "booked" | "requested";
  now: Date | string;
  startsAt: Date | string;
  timeZone: string;
  locale: Locale;
  words?: Locale;
  calendarLabels: CalendarTileLabels;
  className?: string;
};

export function UpcomingRideCard({
  href,
  eyebrow,
  title,
  when,
  state = "booked",
  now,
  startsAt,
  timeZone,
  locale,
  words,
  calendarLabels,
  className,
}: UpcomingRideCardProps) {
  const requested = state === "requested";

  return (
    <Link
      href={href}
      transitionTypes={["push"]}
      className={cn(
        "group flex items-center gap-4 rounded-2xl bg-paper p-5 shadow-lift outline-none transition-[background-color,scale] hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink active:scale-99 motion-reduce:transition-none",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.25">
        <span
          className={cn(
            "flex min-w-0 items-center gap-2 text-2sm font-medium",
            requested ? "text-mint-ink" : "text-ink-soft",
          )}
        >
          {requested ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full bg-mint motion-safe:animate-pulse"
            />
          ) : null}
          <span className="truncate">{eyebrow}</span>
        </span>
        <span className="line-clamp-2 font-display text-lg leading-snug font-bold tracking-tight text-balance text-ink">
          {title}
        </span>
        <span className="mt-1 flex items-center gap-1 text-2sm text-ink-soft">
          <span className="truncate">{when}</span>
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </div>
      <CalendarTile
        now={now}
        startsAt={startsAt}
        timeZone={timeZone}
        locale={locale}
        words={words}
        labels={calendarLabels}
        show={requested ? "date" : "countdown"}
      />
    </Link>
  );
}
