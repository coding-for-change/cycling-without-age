import { calendarDate } from "@/lib/calendar";
import {
  formatLongDateWithWeekday,
  formatShortDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import { fullName } from "@/lib/utils";

type Requested = {
  requestedStartsAt: Date;
  requestedEndsAt: Date;
  chapter: { timeZone: string };
};

/** The window asked for, read on the chapter's own clock wherever the reader is. */
export function requestedWhen(
  request: Requested,
  notation: Locale,
  { short = false }: { short?: boolean } = {},
) {
  const { timeZone } = request.chapter;
  const day = calendarDate(request.requestedStartsAt, timeZone);
  return {
    date: short
      ? formatShortDateWithWeekday(day, notation)
      : formatLongDateWithWeekday(day, notation),
    time: formatTimeRange(
      request.requestedStartsAt,
      request.requestedEndsAt,
      notation,
      timeZone,
    ),
  };
}

export const requestedRiders = (request: {
  passengers: { passenger: { firstName: string; lastName: string } }[];
}) => request.passengers.map(({ passenger }) => fullName(passenger));

export const requestedRoute = (request: {
  pickupName: string | null;
  rideLocation: { name: string } | null;
  destinationName: string | null;
}) => ({
  from: request.rideLocation?.name ?? request.pickupName,
  to: request.destinationName,
});

/** "Sonnenhof · Sonnenstraße 12" — the name only once when the address starts with it. */
export const placeLine = (name: string | null, address: string | null) =>
  !name
    ? address
    : !address || address.startsWith(name)
      ? (address ?? name)
      : `${name} · ${address}`;

/** "Get somewhere · Home → Dr. Weber · And back again" */
export const routeLine = (
  model: string,
  from: string | null,
  to: string | null,
  roundTrip: string | null,
) =>
  [model, from && to ? `${from} → ${to}` : (from ?? to), roundTrip]
    .filter(Boolean)
    .join(" · ");
