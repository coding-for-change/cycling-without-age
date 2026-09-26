import { Bike, MapPin, UserRound } from "lucide-react";
import { calendarDate, dayKey } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTime,
  type Locale,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { PilotRideRow, RideCalendarRow } from "../facade";
import {
  ridePilots,
  rideRiderNames,
  rideTone,
  rideTrishawNames,
  rideWhere,
  type CalendarStrings,
} from "./ride-presentation";

/**
 * The passenger agenda passes the shared calendar shape; the pilot agenda
 * passes rows that also carry the roster. One component rather than two,
 * because the only difference is whether the rider names are known — and only
 * the assigned pilot is given them.
 */
type AgendaRide = RideCalendarRow & Partial<Pick<PilotRideRow, "roster">>;

type Props = {
  rides: AgendaRide[];
  strings: CalendarStrings;
  /** Notation locale — how dates and times are written. */
  locale: Locale;
  /** Words locale — plural forms are read, not computed. */
  words: Locale;
  title?: string;
};

/**
 * The pilot's and passenger's calendar: what is coming, in order, grouped by
 * day. An agenda rather than a month grid on purpose — on a phone, "my next
 * three rides" is the whole question, and a grid answers it worse.
 *
 * Every time is rendered in the ride's own chapter zone, so a pilot reading
 * this abroad still sees when the ride actually starts.
 */
export function RideAgenda({ rides, strings, locale, words, title }: Props) {
  if (!rides.length) {
    return (
      <section className="flex flex-col gap-3">
        {title ? <h2 className="text-base">{title}</h2> : null}
        <p className="text-2sm text-ink-soft">{strings.agendaEmpty}</p>
      </section>
    );
  }

  const days = new Map<string, AgendaRide[]>();
  for (const ride of rides) {
    const key = dayKey(ride.startsAt, ride.chapter.timeZone);
    const bucket = days.get(key);
    if (bucket) bucket.push(ride);
    else days.set(key, [ride]);
  }

  return (
    <section className="flex flex-col gap-5">
      {title ? <h2 className="text-base">{title}</h2> : null}
      {[...days.entries()].map(([key, dayRides]) => (
        <div
          key={key}
          className="flex flex-col gap-3"
        >
          <h3 className="text-2sm text-ink-soft font-display">
            {formatShortDateWithWeekday(
              calendarDate(dayRides[0].startsAt, dayRides[0].chapter.timeZone),
              locale,
            )}
          </h3>
          <ul className="flex flex-col gap-3">
            {dayRides.map((ride) => (
              <AgendaRow
                key={ride.id}
                ride={ride}
                strings={strings}
                locale={locale}
                words={words}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function AgendaRow({
  ride,
  strings,
  locale,
  words,
}: {
  ride: AgendaRide;
  strings: CalendarStrings;
  locale: Locale;
  words: Locale;
}) {
  const zone = ride.chapter.timeZone;
  const where = rideWhere(ride, strings);
  const pilots = ridePilots(ride);
  const cancelled = ride.status === "cancelled";

  return (
    <li
      className={cn(
        "flex flex-col gap-1.25 rounded-lg border border-l-4 p-3.5",
        rideTone(ride),
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <time
          dateTime={ride.startsAt.toISOString()}
          className={cn("text-sm font-display", cancelled && "line-through")}
        >
          {formatTime(ride.startsAt, locale, zone)} –{" "}
          {formatTime(ride.endsAt, locale, zone)}
        </time>
        <span className="text-2sm text-ink-soft">
          {strings.models[ride.model]}
        </span>
        {cancelled ? (
          <span className="text-2sm text-ink-soft">{strings.cancelledOn}</span>
        ) : null}
      </div>

      {where ? (
        <p className="text-2sm flex items-center gap-1.25">
          <MapPin
            aria-hidden
            className="size-3.5 shrink-0"
          />
          {where}
        </p>
      ) : null}

      <div className="text-2sm text-ink-soft flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.25">
          <Bike
            aria-hidden
            className="size-3.5 shrink-0"
          />
          {rideTrishawNames(ride, strings)}
        </span>
        <span className="flex items-center gap-1.25">
          <UserRound
            aria-hidden
            className="size-3.5 shrink-0"
          />
          {pilots.length
            ? pilots.map((p) => p.user.name).join(", ")
            : strings.pilotNeeded}
        </span>
        <span>
          {ride.roster?.length
            ? rideRiderNames(ride.roster)
            : ride._count.roster
              ? formatMessage(
                  strings.riders,
                  { count: ride._count.roster },
                  words,
                )
              : strings.noRiders}
        </span>
      </div>
    </li>
  );
}
