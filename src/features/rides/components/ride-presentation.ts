import { PartyPopper, Route, Wind } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/format";
import { fullName } from "@/lib/utils";
import { pickupLabel, pickupOf } from "@/features/passengers/pickup";
import type { SubjectRef } from "@/features/person-profiles";
import type { PilotRideRow, RideCalendarRow } from "../facade";
import type { RideModelName } from "../schemas";

export type CalendarStrings = Dictionary["calendar"];

export const MODEL_ICON = {
  event: PartyPopper,
  pleasure: Wind,
  functional: Route,
} as const;

/**
 * Event rides are the caretaking default, so they carry mint. Functional rides
 * are errands and stay neutral; a cancelled ride keeps its slot on the calendar
 * — the glossary is explicit that cancelling does not free the square — but
 * reads as struck through. Red is never used here: it is reserved for the one
 * primary action on a screen.
 */
export function rideTone(ride: Pick<RideCalendarRow, "model" | "status">) {
  if (ride.status === "cancelled")
    return "border-line bg-canvas-deep text-ink-faint";
  switch (ride.model) {
    case "event":
      return "border-mint bg-mint-tint text-ink";
    case "pleasure":
      return "border-mint/60 bg-mint-tint/60 text-ink";
    case "functional":
      return "border-line bg-canvas-deeper text-ink";
  }
}

/** "Seniorenheim Sonnenhof" · "Sonnenhof to Dr. Weber" for an A→B errand. */
export function rideWhere(
  ride: Pick<RideCalendarRow, "locationName" | "destinationName">,
  strings: Pick<CalendarStrings, "via">,
): string | null {
  const from = ride.locationName?.trim() || null;
  const to = ride.destinationName?.trim() || null;
  if (from && to) return `${from} ${strings.via} ${to}`;
  return from ?? to;
}

export type HeadlinePhrases = {
  rideTo: string;
  rideFrom: string;
  words: Locale;
};

type HeadlineRide = Pick<
  RideCalendarRow,
  "model" | "title" | "locationName" | "destinationName"
>;

function phrasedHeadline(
  ride: HeadlineRide,
  phrases: HeadlinePhrases,
): string | null {
  const from = ride.locationName?.trim() || null;
  const to = ride.destinationName?.trim() || null;
  if (ride.model === "functional" && to)
    return formatMessage(phrases.rideTo, { destination: to }, phrases.words);
  if (ride.model === "pleasure" && from)
    return formatMessage(phrases.rideFrom, { place: from }, phrases.words);
  return null;
}

export const rideHeadline = (
  ride: HeadlineRide,
  strings: { via: string; models: Record<RideModelName, string> },
  phrases?: HeadlinePhrases,
) =>
  (ride.model === "event" ? ride.title?.trim() : null) ||
  (phrases ? phrasedHeadline(ride, phrases) : null) ||
  rideWhere(ride, strings) ||
  strings.models[ride.model];

export function rideCardPlace(ride: HeadlineRide): string | null {
  const from = ride.locationName?.trim() || null;
  const to = ride.destinationName?.trim() || null;
  switch (ride.model) {
    case "functional":
      return to ? from : null;
    case "pleasure":
      return from ? to : null;
    case "event":
      return ride.title?.trim() ? (from ?? to) : null;
  }
}

export const trishawMeta = (option: {
  model: string | null;
  seats: string | null;
  location: string;
}) => [option.model, option.seats, option.location].filter(Boolean).join(" · ");

export const ridePilots = <A extends { role: string }>(ride: {
  assignments: A[];
}) => ride.assignments.filter((a) => a.role === "pilot");

/** The pilots who fill a seat: a demoted one is listed but no longer counts. */
export const seatedPilots = <
  A extends { role: string; stillPiloting?: boolean },
>(ride: {
  assignments: A[];
}) => ridePilots(ride).filter((a) => a.stillPiloting !== false);

/** The trishaws committed to a ride, in name order. */
export const rideTrishaws = (ride: Pick<RideCalendarRow, "trishaws">) =>
  ride.trishaws.map((reservation) => reservation.trishaw);

/** "Sonnenstrahl, Isarwind" — or the placeholder when nothing is committed. */
export function rideTrishawNames(
  ride: Pick<RideCalendarRow, "trishaws">,
  strings: CalendarStrings,
): string {
  const names = rideTrishaws(ride).map((trishaw) => trishaw.name);
  return names.length ? names.join(", ") : strings.noTrishaw;
}

export const rideRiderRefs = (
  roster: PilotRideRow["roster"],
  careHome: string,
): { ref: SubjectRef; name: string; pickup: string | null }[] =>
  roster.flatMap(({ passenger }) =>
    passenger
      ? [
          {
            ref: passenger.userId
              ? { kind: "user" as const, id: passenger.userId }
              : { kind: "passenger" as const, id: passenger.id },
            name: fullName(passenger),
            pickup: pickupLabel(pickupOf(passenger), careHome),
          },
        ]
      : [],
  );

export type RideFleetStrings = { grounded: string; groundedOnRide: string };

export type RideLink = {
  href: (rideId: string) => string;
  open: string;
  cancelled: string;
};

export function rideGroundedNote(
  ride: Pick<RideCalendarRow, "trishaws" | "status" | "endsAt">,
  now: Date,
  fleet: RideFleetStrings,
  words: Locale,
): string | null {
  if (ride.status !== "scheduled" || ride.endsAt.getTime() <= now.getTime())
    return null;
  const grounded = rideTrishaws(ride).filter(
    (trishaw) => trishaw.status !== "active",
  );
  return grounded.length
    ? formatMessage(
        fleet.groundedOnRide,
        { names: grounded.map((trishaw) => trishaw.name).join(", ") },
        words,
      )
    : null;
}
