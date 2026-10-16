import type { LucideIcon } from "lucide-react";
import {
  Ban,
  CalendarClock,
  CalendarPlus,
  Pencil,
  UserMinus,
  UserPlus,
  UserRoundMinus,
  UserRoundPlus,
} from "lucide-react";
import type { PassengerStoryEntry, StoryWindow } from "@/features/rides";
import {
  formatDate,
  formatDateTime,
  formatList,
  formatRelativeTime,
  formatTime,
  type Locale,
} from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";

const ICON: Record<PassengerStoryEntry["type"], LucideIcon> = {
  scheduled: CalendarPlus,
  rescheduled: CalendarClock,
  edited: Pencil,
  cancelled: Ban,
  pilotAssigned: UserPlus,
  pilotUnassigned: UserMinus,
  riderBooked: UserRoundPlus,
  riderRemoved: UserRoundMinus,
};

type Strings = Dictionary["passenger"]["ride"]["story"];
type Told = { sentence: string; details?: string[]; note?: string | null };

/**
 * The ride's history, told to its riders: one line per event on a hairline
 * rail, newest first, each with when it happened.
 */
export function RideStory({
  entries,
  chapter,
  timeZone,
  strings,
  reasons,
  models,
  empty,
  notation,
  words,
  now,
}: {
  entries: PassengerStoryEntry[];
  chapter: string;
  timeZone: string;
  strings: Strings;
  reasons: Dictionary["rides"]["reasons"];
  models: Dictionary["calendar"]["models"];
  empty: string;
  notation: Locale;
  words: Locale;
  now: Date;
}) {
  if (!entries.length) return <p className="text-sm text-ink-soft">{empty}</p>;

  const say = (template: string, values: Record<string, string> = {}) =>
    formatMessage(template, values, words);
  const span = (window: StoryWindow | null) =>
    window
      ? `${formatDateTime(window.startsAt, notation, timeZone)} – ${formatTime(window.endsAt, notation, timeZone)}`
      : strings.nothing;

  const told = (entry: PassengerStoryEntry): Told => {
    switch (entry.type) {
      case "scheduled":
        return {
          sentence: say(
            entry.returnLeg ? strings.scheduledReturn : strings.scheduled,
            { who: entry.by, chapter },
          ),
        };
      case "rescheduled":
        return {
          sentence: say(
            entry.withLeg ? strings.rescheduledWithLeg : strings.rescheduled,
            { who: entry.by, chapter },
          ),
          details: [
            say(strings.change, { from: span(entry.from), to: span(entry.to) }),
          ],
        };
      case "edited": {
        const shown = (
          field: (typeof entry.changes)[number]["field"],
          value: string | null,
        ) =>
          (field === "model" && value
            ? models[value as keyof typeof models]
            : value) ?? strings.nothing;
        return {
          sentence: say(strings.edited, {
            who: entry.by,
            chapter,
            fields: formatList(
              entry.changes.map((change) => strings.fields[change.field]),
              words,
            ),
          }),
          details: entry.changes.map((change) =>
            change.field === "location" || change.field === "destination"
              ? shown(change.field, change.to)
              : say(strings.change, {
                  from: shown(change.field, change.from),
                  to: shown(change.field, change.to),
                }),
          ),
        };
      }
      case "cancelled":
        return {
          sentence: say(strings.cancelled, { who: entry.by, chapter }),
          details: entry.reasonCode ? [reasons[entry.reasonCode]] : [],
          note: entry.note,
        };
      case "pilotAssigned":
      case "pilotUnassigned":
        return {
          sentence: say(strings[entry.type], {
            name: entry.pilot ?? strings.someone,
          }),
        };
      case "riderBooked":
      case "riderRemoved":
        return {
          sentence: say(strings[entry.type], {
            who: entry.by,
            chapter,
            name: entry.rider ?? strings.someone,
          }),
        };
    }
  };

  return (
    <ol>
      {entries.map((entry) => {
        const Icon = ICON[entry.type];
        const { sentence, details = [], note = null } = told(entry);
        return (
          <li
            key={entry.id}
            className="group flex gap-3"
          >
            <div className="flex w-5 shrink-0 flex-col items-center">
              <span className="flex h-6 items-center">
                <Icon
                  aria-hidden
                  className="size-4 text-ink-soft"
                />
              </span>
              <span
                aria-hidden
                className="w-px flex-1 bg-line group-last:hidden"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.25 pb-5 group-last:pb-0">
              <p className="text-sm text-ink-soft">
                <span className="text-ink">{sentence}</span>
                {" · "}
                <time
                  dateTime={entry.createdAt.toISOString()}
                  title={formatDate(entry.createdAt, notation)}
                >
                  {formatRelativeTime(entry.createdAt, words, now)}
                </time>
              </p>
              {details.map((line) => (
                <p
                  key={line}
                  className="text-sm text-ink-soft tabular-nums"
                >
                  {line}
                </p>
              ))}
              {note ? (
                <p className="rounded-xl bg-mint-tint px-3 py-2 text-sm whitespace-pre-wrap break-words text-ink">
                  {note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
