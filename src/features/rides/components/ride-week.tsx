import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  calendarDate,
  dayKey,
  instantAt,
  nextDay,
  startOfDay,
  wallClock,
  weekDays,
} from "@/lib/calendar";
import {
  formatDayOfMonth,
  formatHour,
  formatLongDateWithWeekday,
  formatTime,
  formatWeekdayNarrow,
  type Locale,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { RideCalendarRow } from "../facade";
import { DayHeading } from "./day-heading";
import {
  rideGroundedNote,
  rideHeadline,
  ridePilots,
  rideTone,
  rideTrishawNames,
  type CalendarStrings,
  type RideFleetStrings,
  type RideLink,
} from "./ride-presentation";
import { segmentsOf, visibleBand, type WeekDay } from "./ride-week-geometry";
import {
  RideWeekColumns,
  type RideWeekStrings,
  type WeekRide,
} from "./ride-week-interactions";

type DayNav = {
  selected: string;
  days: Record<string, string>;
  previous: string;
  next: string;
  previousLabel: string;
  nextLabel: string;
};

type Props = {
  rides: RideCalendarRow[];
  anchor: Date;
  timeZone: string;
  weekStartsOn: number;
  strings: CalendarStrings;
  locale: Locale;
  words: Locale;
  now: Date;
  fleet: RideFleetStrings;
  link: RideLink;
  interaction: Omit<RideWeekStrings, "open" | "cancelled" | "grounded">;
  dayNav: DayNav;
};

const HOUR_REM = 3.5;

export function RideWeek({
  rides,
  anchor,
  timeZone,
  weekStartsOn,
  strings,
  locale,
  words,
  now,
  fleet,
  link,
  interaction,
  dayNav,
}: Props) {
  const days: WeekDay[] = weekDays(anchor, timeZone, weekStartsOn).map(
    (day) => {
      const start = startOfDay(day, timeZone);
      return {
        key: dayKey(start, timeZone),
        start,
        end: nextDay(start, timeZone),
      };
    },
  );
  const band = visibleBand(
    days.flatMap((day) =>
      segmentsOf(rides, day, timeZone).map(({ segment }) => segment),
    ),
  );
  const hours = Array.from(
    { length: band.to - band.from },
    (_, i) => band.from + i,
  );
  const todayKey = dayKey(now, timeZone);

  const weekRides: WeekRide[] = rides.map((ride) => ({
    id: ride.id,
    startsAt: ride.startsAt,
    endsAt: ride.endsAt,
    cancelled: ride.status === "cancelled",
    tone: rideTone(ride),
    where: rideHeadline(ride, strings),
    detail: `${rideTrishawNames(ride, strings)} · ${
      ride._count.roster
        ? formatMessage(strings.riders, { count: ride._count.roster }, words)
        : ridePilots(ride).length
          ? strings.roles.pilot
          : strings.pilotNeeded
    }`,
    grounded: rideGroundedNote(ride, now, fleet, words),
    href: link.href(ride.id),
    movable: ride.status === "scheduled",
  }));

  const selected = days.find((day) => day.key === dayNav.selected) ?? days[0];

  return (
    <div className="@container">
      <nav
        aria-label={formatLongDateWithWeekday(
          calendarDate(selected.start, timeZone),
          locale,
        )}
        className="border-line flex items-center gap-1.25 border-b px-2 pb-2 md:hidden"
      >
        <Link
          href={dayNav.previous}
          aria-label={dayNav.previousLabel}
          className="text-ink-soft hover:bg-canvas-deep flex size-9 shrink-0 items-center justify-center rounded-md"
        >
          <ChevronLeft
            aria-hidden
            className="size-4"
          />
        </Link>
        <ol className="grid flex-1 grid-cols-7">
          {days.map((day) => {
            const date = calendarDate(day.start, timeZone);
            const active = day.key === selected.key;
            return (
              <li key={day.key}>
                <Link
                  href={dayNav.days[day.key]}
                  replace
                  scroll={false}
                  aria-current={active ? "date" : undefined}
                  aria-label={formatLongDateWithWeekday(date, locale)}
                  className="flex flex-col items-center gap-1 py-1"
                >
                  <span
                    aria-hidden
                    className="text-ink-soft text-xs"
                  >
                    {formatWeekdayNarrow(date, locale)}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "text-ink flex size-7 items-center justify-center rounded-full text-sm leading-none tabular-nums",
                      day.key === todayKey && "font-semibold",
                      day.key === todayKey && !active && "text-mint-ink",
                      active && "bg-mint-deep text-white",
                    )}
                  >
                    {formatDayOfMonth(date, locale)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <Link
          href={dayNav.next}
          aria-label={dayNav.nextLabel}
          className="text-ink-soft hover:bg-canvas-deep flex size-9 shrink-0 items-center justify-center rounded-md"
        >
          <ChevronRight
            aria-hidden
            className="size-4"
          />
        </Link>
      </nav>

      <div className="grid grid-cols-[3rem_minmax(0,1fr)] md:grid-cols-[3rem_repeat(7,minmax(0,1fr))] @3xl:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        <div
          aria-hidden
          className="max-md:hidden"
        />
        {days.map((day) => {
          const isToday = day.key === todayKey;
          return (
            <div
              key={day.key}
              className={cn(
                "border-line border-b px-1 pb-2 text-center max-md:hidden @3xl:px-2",
                isToday && "border-b-mint border-b-2",
              )}
            >
              <DayHeading
                day={calendarDate(day.start, timeZone)}
                locale={locale}
                isToday={isToday}
              />
            </div>
          );
        })}

        <div className="border-line border-r">
          {hours.map((hour) => {
            const instant = hourInstant(days[0].start, hour, timeZone);
            return (
              <div
                key={hour}
                style={{ height: `${HOUR_REM}rem` }}
                className="text-ink-faint relative text-right text-xs"
              >
                <span className="absolute -top-2 right-1 whitespace-nowrap tabular-nums @3xl:right-2">
                  <span className="@3xl:hidden">
                    {formatHour(instant, locale, timeZone)}
                  </span>
                  <span className="hidden @3xl:inline">
                    {formatTime(instant, locale, timeZone)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <RideWeekColumns
          days={days.map((day) => ({ ...day, isToday: day.key === todayKey }))}
          selectedDay={selected.key}
          band={band}
          hourRem={HOUR_REM}
          timeZone={timeZone}
          locale={locale}
          now={now}
          rides={weekRides}
          strings={{
            ...interaction,
            open: link.open,
            cancelled: link.cancelled,
            grounded: fleet.grounded,
          }}
        />
      </div>

      {rides.length === 0 ? (
        <p className="text-2sm text-ink-soft px-4 pt-5 @3xl:px-2">
          {strings.weekEmpty}
        </p>
      ) : null}
    </div>
  );
}

function hourInstant(day: Date, hour: number, timeZone: string) {
  const { year, month, day: date } = wallClock(day, timeZone);
  return instantAt({ year, month, day: date, hour, minute: 0 }, timeZone);
}
