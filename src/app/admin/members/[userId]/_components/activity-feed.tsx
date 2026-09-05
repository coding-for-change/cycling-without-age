import type { ActivityType } from "@/features/activity";
import { formatDate, type Locale } from "@/lib/format";
import { fill } from "@/lib/utils";

export type FeedEvent = {
  id: string;
  type: ActivityType;
  actorUserId: string | null;
  actor: { name: string } | null;
  payload: unknown;
  createdAt: Date;
};

export type HistoryLabels = Record<ActivityType, string> & {
  you: string;
  someone: string;
  templates: { approval: string; rejection: string };
};

const strings = (payload: unknown): Record<string, string> =>
  payload && typeof payload === "object" && !Array.isArray(payload)
    ? Object.fromEntries(
        Object.entries(payload).filter(
          ([, value]) => typeof value === "string",
        ),
      )
    : {};

export function ActivityFeed({
  events,
  viewerId,
  labels,
  empty,
  notation,
}: {
  events: FeedEvent[];
  viewerId: string;
  labels: HistoryLabels;
  empty: string;
  notation: Locale;
}) {
  if (events.length === 0)
    return <p className="text-sm text-ink-soft">{empty}</p>;

  return (
    <ol className="grid gap-3 rounded-2xl border border-line p-4">
      {events.map((event) => {
        const payload = strings(event.payload);
        const actor =
          event.actorUserId && event.actorUserId === viewerId
            ? labels.you
            : (event.actor?.name ?? labels.someone);
        const template =
          payload.template === "rejection"
            ? labels.templates.rejection
            : labels.templates.approval;

        return (
          <li
            key={event.id}
            className="grid gap-1 border-b border-line pb-3 last:border-0 last:pb-0"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm">
                {fill(labels[event.type], { actor, template })}
              </span>
              <time
                dateTime={event.createdAt.toISOString()}
                className="text-xs text-ink-soft"
              >
                {formatDate(event.createdAt, notation)}
              </time>
            </div>
            {payload.note ? (
              <p className="rounded-xl bg-mint-tint px-3 py-2 text-sm text-ink">
                {payload.note}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
