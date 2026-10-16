import { calendarDate } from "@/lib/calendar";
import {
  formatLongDateWithWeekday,
  formatShortDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
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

export type RouteWords = { to: string; toAndBack: string };

/** "Home to Dr. Weber and back", or the one place a ride out starts from. */
export const routeWay = (
  route: { from: string | null; to: string | null; back?: boolean },
  words: RouteWords,
  language: string,
) =>
  route.from && route.to
    ? formatMessage(
        route.back ? words.toAndBack : words.to,
        { from: route.from, to: route.to },
        language,
      )
    : (route.from ?? route.to);

/** "Get somewhere · Home to Dr. Weber and back" */
export const routeLine = (
  model: string,
  route: { from: string | null; to: string | null; back?: boolean },
  words: RouteWords,
  language: string,
) => [model, routeWay(route, words, language)].filter(Boolean).join(" · ");
