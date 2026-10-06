import {
  Ban,
  Bike,
  CalendarClock,
  CalendarPlus,
  ListOrdered,
  Pencil,
  StickyNote,
  UserMinus,
  UserPlus,
  UserRoundMinus,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import type { rides } from "@/features/rides";
import {
  formatDateTime,
  formatList,
  formatTime,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import type { RideHistoryStrings } from "@/features/rides/components/strings";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import {
  asRecord as record,
  asText as text,
  TimelineBubble,
  TimelineEntry,
  TimelineHeadline,
  TimelineList,
} from "../../../_components/timeline";

type Entry = Awaited<ReturnType<typeof rides.listRideLog>>[number];
type Labels = RideHistoryStrings;
type Field = keyof Labels["fields"];
type Json = Record<string, unknown>;

const ICON: Record<Entry["type"], LucideIcon> = {
  scheduled: CalendarPlus,
  rescheduled: CalendarClock,
  edited: Pencil,
  cancelled: Ban,
  trishawsChanged: Bike,
  pilotAssigned: UserPlus,
  pilotUnassigned: UserMinus,
  riderBooked: UserRoundPlus,
  riderRemoved: UserRoundMinus,
  rosterReordered: ListOrdered,
  note: StickyNote,
};

/** The facade logs every column it touched; people think in four things. */
const FIELD_OF: Record<string, Field> = {
  model: "model",
  title: "title",
  description: "description",
  capacity: "capacity",
  photos: "photos",
  locationName: "location",
  locationAddress: "location",
  latitude: "location",
  longitude: "location",
  destinationName: "destination",
  destinationAddress: "destination",
  destinationLatitude: "destination",
  destinationLongitude: "destination",
  requiredPilots: "requiredPilots",
  note: "note",
};

const names = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => text(record(item).name)).filter(Boolean)
    : [];

export function RideHistory({
  entries,
  viewerId,
  timeZone,
  labels,
  models,
  reasons,
  empty,
  notation,
  words,
}: {
  entries: Entry[];
  viewerId: string;
  timeZone: string;
  labels: Labels;
  models: Dictionary["calendar"]["models"];
  reasons: Dictionary["rides"]["reasons"];
  empty: string;
  notation: Locale;
  words: string;
}) {
  const now = new Date();
  const list = wordsLocale(words);
  const say = (template: string, values: Record<string, string> = {}) =>
    formatMessage(template, values, words);

  const span = (value: unknown) => {
    const window = record(value);
    const startsAt = text(window.startsAt);
    const endsAt = text(window.endsAt);
    if (!startsAt || !endsAt) return "";
    return `${formatDateTime(startsAt, notation, timeZone)}–${formatTime(endsAt, notation, timeZone)}`;
  };

  const shownValue = (field: Field, from: Json): string => {
    const value =
      field === "location"
        ? text(from.locationName) || text(from.locationAddress)
        : field === "destination"
          ? text(from.destinationName) || text(from.destinationAddress)
          : field === "model"
            ? (models[text(from.model) as keyof typeof models] ?? "")
            : field === "title"
              ? text(from.title)
              : field === "capacity"
                ? typeof from.capacity === "number"
                  ? String(from.capacity)
                  : ""
                : typeof from.requiredPilots === "number"
                  ? String(from.requiredPilots)
                  : "";
    return value || labels.nothing;
  };

  return (
    <TimelineList empty={empty}>
      {entries.map((entry) => {
        const payload = record(entry.payload);
        const actor = {
          who: entry.actor && entry.actor.id === viewerId ? "you" : "other",
          actor: entry.actor?.name ?? labels.someone,
        };
        const name = text(payload.name) || labels.formerMember;
        const self = entry.actor !== null && entry.actor.id === payload.userId;

        let sentence: string;
        let details: string[] = [];
        let bubble: string | null = null;

        switch (entry.type) {
          case "scheduled":
            sentence = say(
              payload.returnLegOf ? labels.scheduledReturn : labels.scheduled,
              actor,
            );
            details = [span(payload)].filter(Boolean);
            break;
          case "rescheduled":
            sentence = say(labels.rescheduled, actor);
            details = [
              say(labels.change, {
                from: span(payload.from),
                to: span(payload.to),
              }),
            ];
            break;
          case "edited": {
            const changed = Array.isArray(payload.fields)
              ? payload.fields.map(text)
              : [];
            const fields = [
              ...new Set(
                changed.flatMap((field) =>
                  FIELD_OF[field] ? [FIELD_OF[field]] : [],
                ),
              ),
            ];
            sentence = say(labels.edited, {
              ...actor,
              fields: formatList(
                fields.map((field) => labels.fields[field]),
                list,
              ),
            });
            const from = record(payload.from);
            const to = record(payload.to);
            details = fields
              .filter(
                (field) =>
                  field !== "note" &&
                  field !== "description" &&
                  field !== "photos",
              )
              .map((field) =>
                say(labels.change, {
                  from: shownValue(field, from),
                  to: shownValue(field, to),
                }),
              );
            break;
          }
          case "cancelled": {
            sentence = say(labels.cancelled, actor);
            const reason = text(payload.reasonCode);
            details =
              reason in reasons
                ? [reasons[reason as keyof typeof reasons]]
                : [];
            bubble = text(payload.note) || null;
            break;
          }
          case "trishawsChanged": {
            sentence = say(labels.trishawsChanged, actor);
            const added = names(payload.added);
            const removed = names(payload.removed);
            details = [
              added.length
                ? say(labels.trishawsAdded, {
                    names: formatList(added, list),
                  })
                : "",
              removed.length
                ? say(labels.trishawsRemoved, {
                    names: formatList(removed, list),
                  })
                : "",
            ].filter(Boolean);
            break;
          }
          case "pilotAssigned":
            sentence = self
              ? say(labels.pilotSignedUp, { name })
              : say(labels.pilotAssigned, { ...actor, name });
            break;
          case "pilotUnassigned":
            sentence = self
              ? say(labels.pilotSteppedBack, { name })
              : say(labels.pilotUnassigned, { ...actor, name });
            break;
          case "riderBooked":
            sentence = say(labels.riderBooked, { ...actor, name });
            break;
          case "riderRemoved":
            sentence = say(labels.riderRemoved, { ...actor, name });
            break;
          case "rosterReordered":
            sentence = say(labels.rosterReordered, actor);
            break;
          case "note":
            sentence = say(labels.note, actor);
            bubble = text(payload.text) || null;
            break;
        }

        return (
          <TimelineEntry
            key={entry.id}
            icon={ICON[entry.type]}
          >
            <TimelineHeadline
              sentence={sentence}
              at={entry.createdAt}
              notation={notation}
              words={words}
              now={now}
            />
            {details.map((line, index) => (
              <p
                key={`${index}:${line}`}
                className="text-2sm text-ink-soft tabular-nums"
              >
                {line}
              </p>
            ))}
            {bubble ? <TimelineBubble>{bubble}</TimelineBubble> : null}
          </TimelineEntry>
        );
      })}
    </TimelineList>
  );
}
