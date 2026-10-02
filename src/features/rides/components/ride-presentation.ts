import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/format";
import type { RideCalendarRow } from "../facade";

export type CalendarStrings = Dictionary["calendar"];

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
  strings: CalendarStrings,
): string | null {
  const from = ride.locationName?.trim() || null;
  const to = ride.destinationName?.trim() || null;
  if (from && to) return `${from} ${strings.via} ${to}`;
  return from ?? to;
}

export const ridePilots = (ride: Pick<RideCalendarRow, "assignments">) =>
  ride.assignments.filter((a) => a.role === "pilot");

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

/** "Anna Bauer, Karl Weber" — who an assigned pilot is taking out. */
export const rideRiderNames = (
  roster: { passenger: { firstName: string; lastName: string } }[],
) =>
  roster
    .map(({ passenger }) =>
      `${passenger.firstName} ${passenger.lastName}`.trim(),
    )
    .join(", ");

export type RideFleetStrings = { grounded: string; groundedOnRide: string };

export type RideAllocationLink = {
  href: (rideId: string) => string;
  label: string;
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
