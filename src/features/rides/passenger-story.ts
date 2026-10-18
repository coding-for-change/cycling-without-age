import type { $Enums } from "@/generated/prisma";
import { RIDE_CANCELLATION_REASONS } from "@/lib/ride-cancellation";

type RideCancellationReason = (typeof RIDE_CANCELLATION_REASONS)[number];

export type StoryLogEntry = {
  id: string;
  type: $Enums.RideLogType;
  payload: unknown;
  createdAt: Date;
  actor: { id: string; name: string } | null;
};

/** Admins act for their chapter; a rider is told what the chapter did, not who. */
export type StoryActor = "you" | "chapter";

export type StoryWindow = { startsAt: string; endsAt: string };

export type StoryField = "location" | "destination" | "title" | "model";

type Base = { id: string; createdAt: Date };

export type PassengerStoryEntry = Base &
  (
    | { type: "scheduled"; by: StoryActor; returnLeg: boolean }
    | {
        type: "rescheduled";
        by: StoryActor;
        from: StoryWindow | null;
        to: StoryWindow | null;
        withLeg: boolean;
      }
    | {
        type: "edited";
        by: StoryActor;
        changes: {
          field: StoryField;
          from: string | null;
          to: string | null;
        }[];
      }
    | {
        type: "cancelled";
        by: StoryActor;
        reasonCode: RideCancellationReason | null;
        note: string | null;
      }
    | { type: "pilotAssigned" | "pilotUnassigned"; pilot: string | null }
    | {
        type: "riderBooked" | "riderRemoved";
        by: StoryActor;
        rider: string | null;
      }
  );

const FIELD_COLUMNS: Record<StoryField, readonly string[]> = {
  location: ["locationName", "locationAddress", "latitude", "longitude"],
  destination: [
    "destinationName",
    "destinationAddress",
    "destinationLatitude",
    "destinationLongitude",
  ],
  title: ["title"],
  model: ["model"],
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const windowOf = (value: unknown): StoryWindow | null => {
  const startsAt = text(record(value).startsAt);
  const endsAt = text(record(value).endsAt);
  return startsAt && endsAt ? { startsAt, endsAt } : null;
};

const reasonOf = (value: unknown) =>
  (RIDE_CANCELLATION_REASONS as readonly string[]).includes(value as string)
    ? (value as RideCancellationReason)
    : null;

function shownValue(field: StoryField, values: Record<string, unknown>) {
  if (field === "location")
    return text(values.locationName) ?? text(values.locationAddress);
  if (field === "destination")
    return text(values.destinationName) ?? text(values.destinationAddress);
  return text(values[field]);
}

/**
 * A ride can be handed from one rider to the next and its pick-up moved to
 * the new rider's door, so any place in its history — before or after an
 * edit — may be somebody else's address. The story only says that a place
 * changed; where the ride goes now is on the ride itself. The title and the
 * kind of ride keep their before and after.
 */
const PLACES: readonly StoryField[] = ["location", "destination"];

function changesOf(payload: Record<string, unknown>) {
  const fields = Array.isArray(payload.fields) ? payload.fields : [];
  const from = record(payload.from);
  const to = record(payload.to);
  return (Object.keys(FIELD_COLUMNS) as StoryField[])
    .filter((field) =>
      FIELD_COLUMNS[field].some((column) => fields.includes(column)),
    )
    .map((field) =>
      PLACES.includes(field)
        ? { field, from: null, to: null }
        : { field, from: shownValue(field, from), to: shownValue(field, to) },
    );
}

/**
 * A ride's history as its riders may read it. Internal notes, the trishaw
 * shuffle, the roster order and every other rider are left out; admins are
 * folded into their chapter, and only the pilot keeps a name.
 */
export function storyForPassengers(
  entries: StoryLogEntry[],
  passengerIds: string[],
  viewerId: string,
): PassengerStoryEntry[] {
  const mine = new Set(passengerIds);
  return entries.flatMap((entry): PassengerStoryEntry[] => {
    const base = { id: entry.id, createdAt: entry.createdAt };
    const by: StoryActor = entry.actor?.id === viewerId ? "you" : "chapter";
    const payload = record(entry.payload);

    switch (entry.type) {
      case "scheduled":
        return [
          {
            ...base,
            type: "scheduled",
            by,
            returnLeg: !!text(payload.returnLegOf),
          },
        ];
      case "rescheduled":
        return [
          {
            ...base,
            type: "rescheduled",
            by,
            from: windowOf(payload.from),
            to: windowOf(payload.to),
            withLeg: !!text(payload.withLegOf),
          },
        ];
      case "edited": {
        const changes = changesOf(payload);
        return changes.length ? [{ ...base, type: "edited", by, changes }] : [];
      }
      case "cancelled":
        return [
          {
            ...base,
            type: "cancelled",
            by,
            reasonCode: reasonOf(payload.reasonCode),
            note: text(payload.note),
          },
        ];
      case "pilotAssigned":
      case "pilotUnassigned":
        return [{ ...base, type: entry.type, pilot: text(payload.name) }];
      case "riderBooked":
      case "riderRemoved": {
        const passengerId = text(payload.passengerId);
        return passengerId && mine.has(passengerId)
          ? [{ ...base, type: entry.type, by, rider: text(payload.name) }]
          : [];
      }
      default:
        return [];
    }
  });
}
