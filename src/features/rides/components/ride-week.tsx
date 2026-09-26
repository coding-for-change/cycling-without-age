import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import {
  calendarDate,
  dayKey,
  daySegment,
  instantAt,
  lanes,
  MINUTES_IN_DAY,
  nextDay,
  startOfDay,
  wallClock,
  weekDays,
} from "@/lib/calendar";
import {
  formatHour,
  formatPlural,
  formatTime,
  type Locale,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RideCalendarRow } from "../facade";
import { DayHeading } from "./day-heading";
import {
  rideGroundedNote,
  ridePilots,
  rideTone,
  rideTrishawNames,
  rideWhere,
  type CalendarStrings,
  type RideAllocationLink,
  type RideFleetStrings,
} from "./ride-presentation";

type Props = {
  rides: RideCalendarRow[];
  /** Any instant inside the week to draw. */
  anchor: Date;
  timeZone: string;
  weekStartsOn: number;
  strings: CalendarStrings;
  locale: Locale;
  words: Locale;
  now: Date;
  fleet: RideFleetStrings;
  allocate: RideAllocationLink;
};

/** 56px an hour — dense enough for a working week, tall enough to read. */
const HOUR_REM = 3.5;
const DEFAULT_BAND = { from: 8, to: 18 };

type Segment = { from: number; to: number };

type Column = {
  key: string;
  day: Date;
  rides: RideCalendarRow[];
  segments: Segment[];
};

/**
 * The Chapter Operating Calendar: the week the chapter is delivering rides in.
 *
 * Hours are trimmed to what the week actually uses, so a chapter that only
 * rides in the afternoon does not scroll past an empty morning. Navigation
 * lives in the URL, so this stays a Server Component and the week changes
 * without shipping a calendar to the browser.
 *
 * All seven days always fit: below the `@3xl` container width the hour rail
 * narrows to hour-only labels, the day heads stack, and a ride chip wraps its
 * name instead of truncating it — a phone shows the whole week, not four days
 * and a scrollbar.
 */
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
  allocate,
}: Props) {
  const columns = buildColumns(rides, anchor, timeZone, weekStartsOn);
  const band = visibleBand(columns.flatMap((column) => column.segments));
  const hours = Array.from(
    { length: band.to - band.from },
    (_, i) => band.from + i,
  );
  const todayKey = dayKey(now, timeZone);

  return (
    <div className="@container">
      <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] @3xl:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        <div aria-hidden />
        {columns.map((column) => {
          const isToday = column.key === todayKey;
          return (
            <div
              key={column.key}
              className={cn(
                "border-line border-b px-1 pb-2 text-center @3xl:px-2",
                isToday && "border-b-mint border-b-2",
              )}
            >
              <DayHeading
                day={calendarDate(column.day, timeZone)}
                locale={locale}
                isToday={isToday}
              />
            </div>
          );
        })}

        <div className="border-line border-r">
          {hours.map((hour) => {
            const instant = hourInstant(columns[0].day, hour, timeZone);
            return (
              <div
                key={hour}
                style={{ height: `${HOUR_REM}rem` }}
                className="text-ink-faint relative text-right text-xs"
              >
                <span className="absolute -top-2 right-1 whitespace-nowrap @3xl:right-2">
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

        {columns.map((column) => (
          <DayColumn
            key={column.key}
            column={column}
            band={band}
            hours={hours.length}
            timeZone={timeZone}
            strings={strings}
            locale={locale}
            words={words}
            now={now}
            fleet={fleet}
            allocate={allocate}
          />
        ))}
      </div>

      {rides.length === 0 ? (
        <p className="text-2sm text-ink-soft px-4 pt-5 @3xl:px-2">
          {strings.weekEmpty}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One column per day, holding every ride that *touches* that day rather than
 * only the ones that start in it — a ride running 23:00→02:00 belongs to both
 * days, clipped to each.
 */
function buildColumns(
  rides: RideCalendarRow[],
  anchor: Date,
  timeZone: string,
  weekStartsOn: number,
): Column[] {
  return weekDays(anchor, timeZone, weekStartsOn).map((day) => {
    const start = startOfDay(day, timeZone);
    const end = nextDay(start, timeZone);

    const dayRides: RideCalendarRow[] = [];
    const segments: Segment[] = [];
    for (const ride of rides) {
      const segment = daySegment(ride, start, end, timeZone);
      if (!segment) continue;
      dayRides.push(ride);
      segments.push(segment);
    }

    return {
      key: dayKey(start, timeZone),
      day: start,
      rides: dayRides,
      segments,
    };
  });
}

function DayColumn({
  column,
  band,
  hours,
  timeZone,
  strings,
  locale,
  words,
  now,
  fleet,
  allocate,
}: {
  column: Column;
  band: { from: number; to: number };
  hours: number;
  timeZone: string;
  strings: CalendarStrings;
  locale: Locale;
  words: Locale;
  now: Date;
  fleet: RideFleetStrings;
  allocate: RideAllocationLink;
}) {
  const bandStart = band.from * 60;
  const bandMinutes = (band.to - band.from) * 60;
  const packed = lanes(column.rides);

  return (
    <div
      className="border-line relative border-r"
      style={{ height: `${hours * HOUR_REM}rem` }}
    >
      {Array.from({ length: hours }, (_, i) => (
        <div
          key={i}
          style={{ height: `${HOUR_REM}rem` }}
          className="border-line border-b"
        />
      ))}

      {column.rides.map((ride, index) => {
        const { from, to } = column.segments[index];
        const top = ((from - bandStart) / bandMinutes) * 100;
        const height = ((to - from) / bandMinutes) * 100;
        const { lane, lanes: width } = packed[index];
        const clampedTop = Math.max(0, top);
        const cancelled = ride.status === "cancelled";
        const groundedNote = rideGroundedNote(ride, now, fleet);
        const where = rideWhere(ride, strings) ?? strings.models[ride.model];

        return (
          <article
            key={ride.id}
            style={{
              top: `${clampedTop}%`,
              height: `${Math.min(Math.max(height, 4), 100 - clampedTop)}%`,
              left: `${(lane / width) * 100}%`,
              width: `${100 / width}%`,
            }}
            className={cn(
              "absolute flex flex-col overflow-hidden rounded-md border border-l-2 p-1 text-xs @3xl:border-l-4 @3xl:px-2 @3xl:py-1.25",
              rideTone(ride),
              !cancelled &&
                "has-[a:focus-visible]:ring-ring/50 transition-shadow has-[a:focus-visible]:ring-2 has-[a:hover]:shadow-lift motion-reduce:transition-none",
            )}
          >
            {!cancelled ? (
              <Link
                href={allocate.href(ride.id)}
                scroll={false}
                aria-label={`${allocate.label} · ${formatTime(ride.startsAt, locale, timeZone)} ${where}`}
                className="absolute inset-0 z-10 rounded-md outline-none"
              />
            ) : null}
            {groundedNote ? (
              <p
                title={groundedNote}
                className="bg-red-tint text-ink order-first mb-0.5 flex w-fit max-w-full items-center gap-1 rounded-full px-1 py-0.5 @3xl:px-1.25"
              >
                <TriangleAlert
                  aria-hidden
                  className="text-red size-3 shrink-0"
                />
                <span
                  aria-hidden
                  className="hidden truncate @3xl:inline"
                >
                  {fleet.grounded}
                </span>
                <span className="sr-only">{groundedNote}</span>
              </p>
            ) : null}
            <p
              className={cn(
                "font-display order-2 @3xl:order-1 @3xl:truncate",
                cancelled && "line-through",
              )}
            >
              {formatTime(ride.startsAt, locale, timeZone)}
            </p>
            <p
              className={cn(
                "order-1 font-medium hyphens-auto wrap-break-word @3xl:order-2 @3xl:truncate @3xl:font-normal",
                cancelled && "line-through @3xl:no-underline",
              )}
            >
              {where}
            </p>
            <p className="order-3 hidden truncate opacity-70 @3xl:block">
              {rideTrishawNames(ride, strings)}
              {" · "}
              {ride._count.roster
                ? formatPlural(ride._count.roster, strings.riders, words)
                : ridePilots(ride).length
                  ? strings.roles.pilot
                  : strings.pilotNeeded}
            </p>
          </article>
        );
      })}
    </div>
  );
}

/**
 * The hour band the week actually uses, padded by an hour and clamped to a day.
 * Read off the clipped segments, so a ride crossing midnight widens each day it
 * touches by the part that lands there rather than by its whole span.
 */
function visibleBand(segments: Segment[]) {
  if (!segments.length) return DEFAULT_BAND;
  let from = DEFAULT_BAND.from;
  let to = DEFAULT_BAND.to;
  for (const segment of segments) {
    from = Math.min(from, Math.floor(segment.from / 60));
    // A ride ending at 17:30 needs the 18:00 line drawn.
    to = Math.max(to, Math.ceil(segment.to / 60));
  }
  return {
    from: Math.max(0, from - 1),
    to: Math.min(MINUTES_IN_DAY / 60, to + 1),
  };
}

/**
 * The instant at which the chapter's clock reads this hour — not the instant
 * UTC does. `formatTime` renders an instant in a zone, so handing it a UTC
 * o'clock would label the 09:00 line "11:00" in Berlin.
 */
function hourInstant(day: Date, hour: number, timeZone: string) {
  const { year, month, day: date } = wallClock(day, timeZone);
  return instantAt({ year, month, day: date, hour, minute: 0 }, timeZone);
}
