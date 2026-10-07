import { Fragment } from "react";
import Link from "next/link";
import { Bike, House, MapPin, UserRound } from "lucide-react";
import { subjectSlug, type SubjectRef } from "@/features/person-profiles";
import { calendarDate, dayKey } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { PilotRideRow, RideCalendarRow } from "../facade";
import {
  ridePilots,
  rideRiderRefs,
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
  profileBase?: string;
};

/**
 * The pilot's and passenger's calendar: what is coming, in order, grouped by
 * day. An agenda rather than a month grid on purpose — on a phone, "my next
 * three rides" is the whole question, and a grid answers it worse.
 *
 * Every time is rendered in the ride's own chapter zone, so a pilot reading
 * this abroad still sees when the ride actually starts.
 */
export function RideAgenda({
  rides,
  strings,
  locale,
  words,
  title,
  profileBase,
}: Props) {
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
                profileBase={profileBase}
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
  profileBase,
}: {
  ride: AgendaRide;
  strings: CalendarStrings;
  locale: Locale;
  words: Locale;
  profileBase?: string;
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
          {formatTimeRange(ride.startsAt, ride.endsAt, locale, zone)}
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
          {pilots.length ? (
            <People
              people={pilots.map((p) => ({
                ref: { kind: "user", id: p.user.id },
                name: p.user.name,
              }))}
              profileBase={profileBase}
            />
          ) : (
            strings.pilotNeeded
          )}
        </span>
        <span>
          {ride._count.roster
            ? formatMessage(
                strings.riders,
                { count: ride._count.roster },
                words,
              )
            : strings.noRiders}
        </span>
      </div>

      {ride.roster?.length ? (
        <ul className="text-2sm flex flex-col gap-1">
          {rideRiderRefs(ride.roster, strings.pickupCareHome).map((rider) => (
            <li
              key={subjectSlug(rider.ref)}
              className="flex min-w-0 items-center gap-1.25"
            >
              <House
                aria-hidden
                className="size-3.5 shrink-0 text-ink-soft"
              />
              <People
                people={[rider]}
                profileBase={profileBase}
              />
              {rider.pickup ? (
                <span
                  className="truncate text-ink-soft"
                  title={formatMessage(
                    strings.pickupLabel,
                    { place: rider.pickup },
                    words,
                  )}
                >
                  · {rider.pickup}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function People({
  people,
  profileBase,
}: {
  people: { ref: SubjectRef; name: string }[];
  profileBase?: string;
}) {
  if (!profileBase) return people.map((person) => person.name).join(", ");
  return people.map((person, index) => (
    <Fragment key={subjectSlug(person.ref)}>
      {index > 0 ? ", " : null}
      <Link
        href={`${profileBase}/${subjectSlug(person.ref)}`}
        className="rounded-sm underline-offset-2 outline-none hover:text-ink hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {person.name}
      </Link>
    </Fragment>
  ));
}
