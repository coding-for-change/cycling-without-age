import {
  calendarDate,
  dayKey,
  instantAt,
  lanes,
  minutesFromMidnight,
  startOfDay,
  wallClock,
  weekDays,
} from "@/lib/calendar";
import {
  formatPlural,
  formatShortDateWithWeekday,
  formatTime,
  type Locale,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RideCalendarRow } from "../facade";
import {
  ridePilots,
  rideTone,
  rideTrishawNames,
  rideWhere,
  type CalendarStrings,
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
  now?: Date;
};

/** 56px an hour — dense enough for a working week, tall enough to read. */
const HOUR_REM = 3.5;
const DEFAULT_BAND = { from: 8, to: 18 };

/**
 * The Chapter Operating Calendar: the week the chapter is delivering rides in.
 *
 * Hours are trimmed to what the week actually uses, so a chapter that only
 * rides in the afternoon does not scroll past an empty morning. Navigation
 * lives in the URL, so this stays a Server Component and the week changes
 * without shipping a calendar to the browser.
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
}: Props) {
  const days = weekDays(anchor, timeZone, weekStartsOn);
  const band = visibleBand(rides, timeZone);
  const hours = Array.from(
    { length: band.to - band.from },
    (_, i) => band.from + i,
  );
  const todayKey = now ? dayKey(now, timeZone) : null;

  const byDay = new Map<string, RideCalendarRow[]>();
  for (const ride of rides) {
    const key = dayKey(ride.startsAt, timeZone);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(ride);
    else byDay.set(key, [ride]);
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-3xl grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        <div aria-hidden />
        {days.map((day) => {
          const key = dayKey(day, timeZone);
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={cn(
                "border-line border-b px-2 pb-2 text-center",
                isToday && "border-b-mint border-b-2",
              )}
            >
              <span
                className={cn(
                  "text-2sm",
                  isToday ? "text-ink font-display" : "text-ink-soft",
                )}
              >
                {formatShortDateWithWeekday(
                  calendarDate(day, timeZone),
                  locale,
                )}
              </span>
            </div>
          );
        })}

        <div className="border-line border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ height: `${HOUR_REM}rem` }}
              className="text-ink-faint relative text-right text-xs"
            >
              <span className="absolute -top-2 right-2">
                {formatTime(
                  hourInstant(days[0], hour, timeZone),
                  locale,
                  timeZone,
                )}
              </span>
            </div>
          ))}
        </div>

        {days.map((day) => (
          <DayColumn
            key={dayKey(day, timeZone)}
            day={day}
            rides={byDay.get(dayKey(day, timeZone)) ?? []}
            band={band}
            hours={hours.length}
            timeZone={timeZone}
            strings={strings}
            locale={locale}
            words={words}
          />
        ))}
      </div>

      {rides.length === 0 ? (
        <p className="text-2sm text-ink-soft px-2 pt-5">{strings.weekEmpty}</p>
      ) : null}
    </div>
  );
}

function DayColumn({
  day,
  rides,
  band,
  hours,
  timeZone,
  strings,
  locale,
  words,
}: {
  day: Date;
  rides: RideCalendarRow[];
  band: { from: number; to: number };
  hours: number;
  timeZone: string;
  strings: CalendarStrings;
  locale: Locale;
  words: Locale;
}) {
  const dayStart = startOfDay(day, timeZone);
  const bandStart = band.from * 60;
  const bandMinutes = (band.to - band.from) * 60;
  const packed = lanes(rides);

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

      {rides.map((ride, index) => {
        const from = minutesFromMidnight(ride.startsAt, dayStart);
        const to = minutesFromMidnight(ride.endsAt, dayStart);
        const top = ((from - bandStart) / bandMinutes) * 100;
        const height = ((to - from) / bandMinutes) * 100;
        const { lane, lanes: width } = packed[index];

        return (
          <article
            key={ride.id}
            style={{
              top: `${Math.max(0, top)}%`,
              height: `${Math.max(height, 4)}%`,
              left: `${(lane / width) * 100}%`,
              width: `${100 / width}%`,
            }}
            className={cn(
              "absolute overflow-hidden rounded-md border border-l-4 px-2 py-1.25",
              rideTone(ride),
            )}
          >
            <p
              className={cn(
                "truncate text-xs font-display",
                ride.status === "cancelled" && "line-through",
              )}
            >
              {formatTime(ride.startsAt, locale, timeZone)}
            </p>
            <p className="truncate text-xs">
              {rideWhere(ride, strings) ?? strings.models[ride.model]}
            </p>
            <p className="truncate text-xs opacity-70">
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

/** The hour band the week actually uses, padded by an hour and clamped to a day. */
function visibleBand(rides: RideCalendarRow[], timeZone: string) {
  if (!rides.length) return DEFAULT_BAND;
  let from = DEFAULT_BAND.from;
  let to = DEFAULT_BAND.to;
  for (const ride of rides) {
    const start = wallClock(ride.startsAt, timeZone);
    const end = wallClock(ride.endsAt, timeZone);
    from = Math.min(from, start.hour);
    // A ride ending at 17:30 needs the 18:00 line drawn.
    to = Math.max(to, end.minute > 0 ? end.hour + 1 : end.hour);
  }
  return { from: Math.max(0, from - 1), to: Math.min(24, to + 1) };
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
