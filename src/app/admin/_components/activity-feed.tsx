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
import type { ActivityType } from "@/lib/activity";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import type { Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import {
  payloadStrings,
  TimelineBubble,
  TimelineEntry,
  TimelineHeadline,
  TimelineList,
} from "./timeline";

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
  countryDeleted: Trash2,
};

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
  const now = new Date();

  return (
    <TimelineList empty={empty}>
      {events.map((event) => {
        const payload = payloadStrings(event.payload);
        const actor =
          event.actorUserId && event.actorUserId === viewerId
            ? labels.you
            : (event.actor?.name ?? labels.someone);
        const template =
          labels.templates[payload.template] ?? labels.templates.approval;
        const field = labels.fields[payload.field] ?? payload.field ?? "";
        const changed = "from" in payload || "to" in payload;

        return (
          <TimelineEntry
            key={event.id}
            icon={ICON[event.type]}
            marker={
              event.actorUserId ? (
                <PersonAvatar
                  svg={avatarSvg(
                    event.actor
                      ? avatarSeed(event.actor.email)
                      : event.actorUserId,
                  )}
                  className="size-4"
                />
              ) : undefined
            }
          >
            <TimelineHeadline
              sentence={formatMessage(
                labels[event.type],
                { name: "", ...payload, actor, template, field },
                words,
              )}
              at={event.createdAt}
              notation={notation}
              words={words}
              now={now}
            />
            {payload.note ? (
              <TimelineBubble>{payload.note}</TimelineBubble>
            ) : null}
            {changed ? (
              <TimelineBubble tone="muted">
                {formatMessage(
                  labels.change,
                  {
                    from: payload.from || labels.nothing,
                    to: payload.to || labels.nothing,
                  },
                  words,
                )}
              </TimelineBubble>
            ) : null}
          </TimelineEntry>
        );
      })}
    </TimelineList>
  );
}
