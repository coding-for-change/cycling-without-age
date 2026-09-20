import { Bike } from "lucide-react";
import { calendarDate, dayKey, daysTouched, weekDays } from "@/lib/calendar";
import { formatTime, type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RideCalendarRow, TrishawRow } from "../facade";
import { DayHeading } from "./day-heading";
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
 *
 * Below the `@3xl` container width the trishaw column is gone: each trishaw
 * becomes its own row group with the name on a line of its own above its seven
 * day squares, so a phone still shows the whole week.
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
    <div className="@container">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th
              scope="col"
              className="border-line text-2sm text-ink-soft hidden w-44 border-b px-3 pb-2 text-left font-normal @3xl:table-cell"
            >
              {strings.trishaw}
            </th>
            {days.map((day) => {
              const key = dayKey(day, timeZone);
              const isToday = key === todayKey;
              return (
                <th
                  key={key}
                  scope="col"
                  className={cn(
                    "border-line border-b px-1 pb-2 text-center font-normal @3xl:px-2",
                    isToday && "border-b-mint border-b-2",
                  )}
                >
                  <DayHeading
                    day={calendarDate(day, timeZone)}
                    locale={locale}
                    isToday={isToday}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        {trishaws.map((trishaw) => (
          <tbody key={trishaw.id}>
            <tr className="@3xl:hidden">
              <th
                scope="rowgroup"
                colSpan={days.length}
                className="px-1 pt-3 pb-1.25 text-left"
              >
                <TrishawLabel
                  trishaw={trishaw}
                  strings={strings}
                />
              </th>
            </tr>
            <tr className="align-top">
              <th
                scope="row"
                className="border-line hidden border-b px-3 py-3 text-left @3xl:table-cell"
              >
                <TrishawLabel
                  trishaw={trishaw}
                  strings={strings}
                />
              </th>
              {days.map((day) => {
                const key = dayKey(day, timeZone);
                const dayRides = (
                  byTrishawDay.get(`${trishaw.id}/${key}`) ?? []
                ).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

                return (
                  <td
                    key={key}
                    className="border-line border-b p-1 @3xl:p-1.25"
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
          </tbody>
        ))}
      </table>
    </div>
  );
}

function TrishawLabel({
  trishaw,
  strings,
}: {
  trishaw: TrishawRow;
  strings: CalendarStrings;
}) {
  return (
    <>
      <span className="text-2sm flex items-center gap-1.25">
        <Bike
          aria-hidden
          className="size-3.5 shrink-0"
        />
        {trishaw.name}
      </span>
      <span className="text-ink-soft block pl-5 text-xs">
        {trishaw.status === "active"
          ? (trishaw.type?.name ?? strings.trishawStatuses.active)
          : strings.trishawStatuses[trishaw.status]}
      </span>
    </>
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
      className={cn(
        "rounded border border-l-2 p-1 text-xs @3xl:border-l-4 @3xl:px-2 @3xl:py-1",
        rideTone(ride),
      )}
      title={range}
    >
      <p
        className={cn(
          "font-display wrap-break-word @3xl:truncate",
          ride.status === "cancelled" && "line-through",
        )}
      >
        <span aria-hidden>{formatTime(ride.startsAt, locale, timeZone)}</span>
        <span className="sr-only">{range}</span>
      </p>
      <p className="line-clamp-3 hyphens-auto wrap-break-word opacity-70 @3xl:line-clamp-1">
        {rideWhere(ride, strings) ?? strings.models[ride.model]}
      </p>
      {ride.status === "cancelled" ? (
        <span className="sr-only">{strings.statuses.cancelled}</span>
      ) : null}
    </div>
  );
}
