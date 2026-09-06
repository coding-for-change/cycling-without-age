import {
  CircleCheck,
  CircleX,
  Globe,
  Inbox,
  KeyRound,
  Mail,
  MapPinned,
  Pencil,
  Send,
  ShieldCheck,
  ShieldMinus,
  Trash2,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import type { ActivityType } from "@/features/activity";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import {
  formatDate,
  formatRelativeTime,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { fill } from "@/lib/utils";

export type FeedEvent = {
  id: string;
  type: ActivityType;
  actorUserId: string | null;
  actor: { name: string; email: string } | null;
  payload: unknown;
  createdAt: Date;
};

export type HistoryLabels = Record<ActivityType, string> & {
  you: string;
  someone: string;
  change: string;
  nothing: string;
  templates: Record<string, string>;
  fields: Record<string, string>;
};

const ICON: Record<ActivityType, LucideIcon> = {
  applicationSubmitted: Inbox,
  applicationApproved: CircleCheck,
  applicationRejected: CircleX,
  roleGranted: ShieldCheck,
  roleRevoked: ShieldMinus,
  memberRemoved: UserMinus,
  emailSent: Mail,
  countryAdminAppointed: Globe,
  countryAdminRemoved: Globe,
  accountCreated: UserPlus,
  invited: Send,
  accountClaimed: KeyRound,
  chapterCreated: MapPinned,
  chapterUpdated: Pencil,
  chapterDeleted: Trash2,
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
  words,
}: {
  events: FeedEvent[];
  viewerId: string;
  labels: HistoryLabels;
  empty: string;
  notation: Locale;
  words: string;
}) {
  if (events.length === 0)
    return <p className="text-2sm text-ink-soft">{empty}</p>;

  const now = new Date();

  return (
    <ol>
      {events.map((event) => {
        const payload = strings(event.payload);
        const actor =
          event.actorUserId && event.actorUserId === viewerId
            ? labels.you
            : (event.actor?.name ?? labels.someone);
        const template =
          labels.templates[payload.template] ?? labels.templates.approval;
        const field = labels.fields[payload.field] ?? payload.field ?? "";
        const changed = "from" in payload || "to" in payload;
        const Icon = ICON[event.type];

        return (
          <li
            key={event.id}
            className="group flex gap-2"
          >
            <div className="flex w-4 shrink-0 flex-col items-center">
              <span className="flex h-5 items-center">
                {event.actorUserId ? (
                  <PersonAvatar
                    svg={avatarSvg(
                      event.actor
                        ? avatarSeed(event.actor.email)
                        : event.actorUserId,
                    )}
                    className="size-4"
                  />
                ) : (
                  <Icon
                    aria-hidden
                    className="size-3.5 text-ink-soft"
                  />
                )}
              </span>
              <span
                aria-hidden
                className="w-px flex-1 bg-line group-last:hidden"
              />
            </div>
            <div className="grid min-w-0 flex-1 gap-2 pb-3 group-last:pb-0">
              <p className="text-2sm text-ink-soft">
                <span className="text-ink">
                  {fill(labels[event.type], {
                    ...payload,
                    actor,
                    template,
                    field,
                  })}
                </span>
                {" · "}
                <time
                  dateTime={event.createdAt.toISOString()}
                  title={formatDate(event.createdAt, notation)}
                >
                  {formatRelativeTime(event.createdAt, wordsLocale(words), now)}
                </time>
              </p>
              {payload.note ? (
                <p className="rounded-xl bg-mint-tint px-3 py-2 text-2sm whitespace-pre-wrap text-ink">
                  {payload.note}
                </p>
              ) : null}
              {changed ? (
                <p className="rounded-xl bg-canvas-deep px-3 py-2 text-2sm break-words text-ink-soft">
                  {fill(labels.change, {
                    from: payload.from || labels.nothing,
                    to: payload.to || labels.nothing,
                  })}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
