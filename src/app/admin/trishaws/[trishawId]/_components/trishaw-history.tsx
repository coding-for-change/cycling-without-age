import Link from "next/link";
import {
  ArrowRightLeft,
  CircleDot,
  OctagonAlert,
  Plus,
  Route,
  StickyNote,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FileImage, fileUrl } from "@/features/fleet/components/file-image";
import {
  DamageClearDialog,
  type DamageClearLabels,
} from "@/features/fleet/components/damage-clear-dialog";
import { formatDateTime, formatTime, type Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { TrishawHistoryItem } from "@/use-cases/trishaw-history";
import {
  payloadStrings,
  RelativeTime,
  TimelineEntry,
} from "../../../_components/timeline";

type Labels = Dictionary["fleet"]["trishaws"]["history"];
type Common = Dictionary["fleet"]["common"];
type RideStatuses = Dictionary["calendar"]["statuses"];

type LogType = Extract<TrishawHistoryItem, { kind: "log" }>["entry"]["type"];

const LOG_ICON: Record<LogType, LucideIcon> = {
  created: Plus,
  statusChanged: CircleDot,
  moved: ArrowRightLeft,
  note: StickyNote,
};

export function TrishawHistory({
  items,
  viewerId,
  canManage,
  scopeQuery,
  labels,
  common,
  rideStatuses,
  clear,
  empty,
  notation,
  words,
}: {
  items: TrishawHistoryItem[];
  viewerId: string;
  canManage: boolean;
  scopeQuery: string;
  labels: Labels;
  common: Common;
  rideStatuses: RideStatuses;
  clear: DamageClearLabels;
  empty: string;
  notation: Locale;
  words: string;
}) {
  if (items.length === 0)
    return <p className="text-2sm text-ink-soft">{empty}</p>;

  const now = new Date();
  const actorName = (actor: { id: string; name: string } | null) =>
    actor ? (actor.id === viewerId ? labels.you : actor.name) : labels.someone;
  const status = (value: string | undefined) =>
    value && value in common.statuses
      ? common.statuses[value as keyof Common["statuses"]]
      : (value ?? "");

  const when = (at: Date) => (
    <RelativeTime
      at={at}
      notation={notation}
      words={words}
      now={now}
    />
  );

  return (
    <ol>
      {items.map((item) => {
        const key = `${item.kind}:${
          item.kind === "ride"
            ? item.ride.id
            : item.kind === "damage"
              ? item.damage.id
              : item.entry.id
        }`;

        if (item.kind === "ride") {
          const { ride } = item;
          const tz = ride.chapter.timeZone;
          const pilots = ride.assignments.filter(
            (assignment) => assignment.role === "pilot",
          );
          return (
            <TimelineEntry
              key={key}
              icon={Route}
            >
              <p className="text-2sm text-ink-soft">
                <span className="text-ink">
                  {ride.locationName
                    ? formatMessage(
                        labels.rideAt,
                        { place: ride.locationName },
                        words,
                      )
                    : labels.ride}
                </span>
                {" · "}
                <time dateTime={ride.startsAt.toISOString()}>
                  {formatDateTime(ride.startsAt, notation, tz)}–
                  {formatTime(ride.endsAt, notation, tz)}
                </time>
                {" · "}
                {ride.chapter.name}
                {" · "}
                {pilots.length > 0 ? (
                  <>
                    {labels.pilotedBy}{" "}
                    {pilots.map((pilot, index) => (
                      <span key={pilot.user.id}>
                        <Link
                          href={`/admin/members/${pilot.user.id}${scopeQuery}`}
                          className="text-ink underline-offset-2 hover:underline"
                        >
                          {pilot.user.name}
                        </Link>
                        {index < pilots.length - 1 ? ", " : null}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-ink-faint">{labels.noPilot}</span>
                )}
                {ride.status !== "scheduled" ? (
                  <>
                    {" "}
                    <Badge
                      className={cn(
                        "align-middle font-normal",
                        ride.status === "completed"
                          ? "bg-mint-tint text-ink"
                          : "bg-canvas-deep text-ink-soft",
                      )}
                    >
                      {rideStatuses[ride.status]}
                    </Badge>
                  </>
                ) : null}
              </p>
            </TimelineEntry>
          );
        }

        if (item.kind === "damage") {
          const { damage } = item;
          const open = damage.clearedAt === null;
          return (
            <TimelineEntry
              key={key}
              icon={damage.grounding ? OctagonAlert : TriangleAlert}
              iconClassName={open ? "text-ink" : undefined}
            >
              <p className="text-2sm text-ink-soft">
                <span className="text-ink">
                  {formatMessage(
                    labels.damage,
                    { actor: actorName(damage.reportedBy) },
                    words,
                  )}
                </span>
                {" · "}
                {when(damage.reportedAt)}
              </p>
              <div
                className={cn(
                  "grid gap-3 rounded-xl border p-3",
                  open ? "border-red/40 bg-red-tint/40" : "border-line",
                )}
              >
                <div className="flex items-start gap-3">
                  {damage.photoFileId ? (
                    <a
                      href={fileUrl(damage.photoFileId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <FileImage
                        fileId={damage.photoFileId}
                        alt={damage.description}
                        className="size-16 rounded-lg"
                      />
                    </a>
                  ) : null}
                  <p className="min-w-0 flex-1 text-2sm whitespace-pre-wrap break-words">
                    {damage.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.25">
                  <Badge
                    className={cn(
                      "font-normal",
                      open ? "bg-paper text-ink" : "bg-mint-tint text-ink",
                    )}
                  >
                    {open ? labels.open : labels.cleared}
                  </Badge>
                  {damage.grounding ? (
                    <Badge
                      className={cn(
                        "font-normal",
                        open
                          ? "bg-red text-white"
                          : "bg-canvas-deep text-ink-soft",
                      )}
                    >
                      {common.grounded}
                    </Badge>
                  ) : null}
                  {open && canManage ? (
                    <span className="ml-auto">
                      <DamageClearDialog
                        damages={[
                          { id: damage.id, description: damage.description },
                        ]}
                        labels={clear}
                      />
                    </span>
                  ) : null}
                </div>
                {!open ? (
                  <p className="rounded-lg bg-canvas-deep px-3 py-2 text-2sm text-ink-soft">
                    {formatMessage(
                      common.damage.clearedBy,
                      {
                        name: damage.clearedBy
                          ? actorName(damage.clearedBy)
                          : common.damage.unknownPerson,
                        note: damage.clearNote ?? "",
                      },
                      words,
                    )}
                    {damage.clearedAt ? (
                      <>
                        {" · "}
                        {when(damage.clearedAt)}
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </TimelineEntry>
          );
        }

        const { entry } = item;
        const payload = payloadStrings(entry.payload);
        const actor = actorName(entry.actor);
        const sentence =
          entry.type === "statusChanged"
            ? formatMessage(
                labels.statusChanged,
                {
                  actor,
                  from: status(payload.from),
                  to: status(payload.to),
                },
                words,
              )
            : entry.type === "moved"
              ? formatMessage(
                  labels.moved,
                  { actor, from: payload.from ?? "", to: payload.to ?? "" },
                  words,
                )
              : entry.type === "note"
                ? formatMessage(labels.note, { actor }, words)
                : formatMessage(labels.created, { actor }, words);

        return (
          <TimelineEntry
            key={key}
            icon={LOG_ICON[entry.type]}
          >
            <p className="text-2sm text-ink-soft">
              <span className="text-ink">{sentence}</span>
              {" · "}
              {when(entry.createdAt)}
            </p>
            {entry.type === "note" && payload.text ? (
              <p className="rounded-xl bg-mint-tint px-3 py-2 text-2sm whitespace-pre-wrap text-ink">
                {payload.text}
              </p>
            ) : null}
          </TimelineEntry>
        );
      })}
    </ol>
  );
}
