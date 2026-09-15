import { Bike } from "lucide-react";
import { calendarDate, dayKey, daysTouched, weekDays } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTime,
  type Locale,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RideCalendarRow, TrishawRow } from "../facade";
import {
  rideTone,
  rideTrishaws,
  rideWhere,
  type CalendarStrings,
} from "./ride-presentation";

type Props = {
  trishaws: TrishawRow[];
  rides: RideCalendarRow[];
  anchor: Date;
  timeZone: string;
  weekStartsOn: number;
  strings: CalendarStrings;
  locale: Locale;
  now?: Date;
};

/**
 * Which trishaw is out when — one row per trishaw, one column per day of the
 * week. Scheduling reserves the equipment for the ride's window (lifecycle
 * phase 2C), so this is the view that answers "can I promise this bike on
 * Thursday" without reading every ride.
 *
 * Cancelled rides release the trishaw, so they are drawn faintly rather than
 * blocking the square.
 */
export function TrishawTimeline({
  trishaws,
  rides,
  anchor,
  timeZone,
  weekStartsOn,
  strings,
  locale,
  now,
}: Props) {
  if (!trishaws.length) {
    return <p className="text-2sm text-ink-soft">{strings.noTrishaws}</p>;
  }

  const days = weekDays(anchor, timeZone, weekStartsOn);
  const todayKey = now ? dayKey(now, timeZone) : null;

  // A ride that books several trishaws occupies a square in each of their rows —
  // which is the whole point of the view: every bike it consumes shows as busy.
  // It occupies every day it touches too, so a ride running past midnight keeps
  // the bike blocked on the following morning rather than vanishing from it.
  const byTrishawDay = new Map<string, RideCalendarRow[]>();
  for (const ride of rides) {
    for (const trishaw of rideTrishaws(ride)) {
      for (const day of daysTouched(ride, timeZone)) {
        const key = `${trishaw.id}/${day}`;
        const bucket = byTrishawDay.get(key);
        if (bucket) bucket.push(ride);
        else byTrishawDay.set(key, [ride]);
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl table-fixed border-collapse">
        <thead>
          <tr>
            <th
              scope="col"
              className="border-line text-2sm text-ink-soft w-44 border-b px-3 pb-2 text-left font-normal"
            >
              {strings.trishaw}
            </th>
            {days.map((day) => {
              const key = dayKey(day, timeZone);
              return (
                <th
                  key={key}
                  scope="col"
                  className={cn(
                    "border-line text-2sm border-b px-2 pb-2 text-center font-normal",
                    key === todayKey
                      ? "text-ink font-display border-b-mint border-b-2"
                      : "text-ink-soft",
                  )}
                >
                  {formatShortDateWithWeekday(
                    calendarDate(day, timeZone),
                    locale,
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {trishaws.map((trishaw) => (
            <tr
              key={trishaw.id}
              className="align-top"
            >
              <th
                scope="row"
                className="border-line border-b px-3 py-3 text-left"
              >
                <span className="text-2sm flex items-center gap-1.25">
                  <Bike
                    aria-hidden
                    className="size-3.5 shrink-0"
                  />
                  {trishaw.name}
                </span>
                <span className="text-ink-soft block pl-5 text-xs">
                  {trishaw.status === "active"
                    ? (trishaw.type ?? strings.trishawStatuses.active)
                    : strings.trishawStatuses[trishaw.status]}
                </span>
              </th>
              {days.map((day) => {
                const key = dayKey(day, timeZone);
                const dayRides = (
                  byTrishawDay.get(`${trishaw.id}/${key}`) ?? []
                ).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

                return (
                  <td
                    key={key}
                    className="border-line border-b p-1.25"
                  >
                    <div className="flex flex-col gap-1.25">
                      {dayRides.map((ride) => (
                        <Reservation
                          key={ride.id}
                          ride={ride}
                          timeZone={timeZone}
                          strings={strings}
                          locale={locale}
                        />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Reservation({
  ride,
  timeZone,
  strings,
  locale,
}: {
  ride: RideCalendarRow;
  timeZone: string;
  strings: CalendarStrings;
  locale: Locale;
}) {
  const range = `${formatTime(ride.startsAt, locale, timeZone)} – ${formatTime(
    ride.endsAt,
    locale,
    timeZone,
  )}`;

  return (
    <div
      className={cn("rounded border border-l-4 px-2 py-1", rideTone(ride))}
      title={range}
    >
      <p
        className={cn(
          "truncate text-xs font-display",
          ride.status === "cancelled" && "line-through",
        )}
      >
        <span aria-hidden>{formatTime(ride.startsAt, locale, timeZone)}</span>
        <span className="sr-only">{range}</span>
      </p>
      <p className="truncate text-xs opacity-70">
        {rideWhere(ride, strings) ?? strings.models[ride.model]}
      </p>
      {ride.status === "cancelled" ? (
        <span className="sr-only">{strings.statuses.cancelled}</span>
      ) : null}
    </div>
  );
}
