import Link from "next/link";
import { headers } from "next/headers";
import {
  CalendarClock,
  CircleCheckBig,
  GraduationCap,
  Inbox,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Character } from "@/components/character";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { rideHeadline } from "@/features/rides/components/ride-presentation";
import { calendarDate } from "@/lib/calendar";
import {
  formatRelativeTime,
  formatShortDateWithWeekday,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { hrefWith } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import {
  attentionCount,
  needsAttention,
  type NeedsAttention,
} from "@/use-cases/admin-overview";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { ExpandableList } from "./expandable-list";

type Row = {
  key: string;
  icon: LucideIcon;
  text: string;
  at?: Date;
  badge?: string;
  href: string;
  action: string;
};

type More = { key: string; href: string; label: string };

const TONE = new Map<LucideIcon, string>([
  [CalendarClock, "bg-red-tint text-red-ink"],
  [Inbox, "bg-mint-tint text-mint-ink"],
  [UserPlus, "bg-mint-deep text-white"],
  [CircleCheckBig, "bg-grey-tint text-ink-soft"],
  [Wrench, "bg-canvas-deeper text-ink"],
  [GraduationCap, "bg-mint text-ink"],
]);

type Context = {
  dict: Dictionary;
  notation: Locale;
  words: Locale;
  scopeQuery: string;
};

const link = (path: string, scopeQuery: string) =>
  hrefWith(path, scopeQuery, {});

function rowsOf(attention: NeedsAttention, context: Context) {
  const { dict, notation, words, scopeQuery } = context;
  const strings = dict.admin.overview.attention;
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, words);
  const headline = (ride: Parameters<typeof rideHeadline>[0]) =>
    rideHeadline(ride, dict.calendar, {
      rideTo: dict.calendar.card.rideTo,
      rideFrom: dict.calendar.card.rideFrom,
      words,
    });

  const groups: { rows: Row[]; total: number; more: string }[] = [
    {
      total: attention.unstaffed.total,
      more: "/admin/rides",
      rows: attention.unstaffed.items.map((ride) => ({
        key: `unstaffed-${ride.id}`,
        icon: CalendarClock,
        text: say(strings.unstaffed.text, {
          ride: headline(ride),
          missing: ride.requiredPilots - ride.pilots,
        }),
        at: ride.startsAt,
        href: link(`/admin/rides/${ride.id}`, scopeQuery),
        action: strings.unstaffed.action,
      })),
    },
    {
      total: attention.requests.total,
      more: "/admin/rides/requests",
      rows: attention.requests.items.map((request) => ({
        key: `request-${request.id}`,
        icon: Inbox,
        text: say(strings.request.text, {
          name: request.requester ?? strings.request.someone,
          date: formatShortDateWithWeekday(
            calendarDate(request.requestedStartsAt, request.timeZone),
            notation,
          ),
        }),
        at: request.createdAt,
        href: link(`/admin/rides/requests/${request.id}`, scopeQuery),
        action: strings.request.action,
      })),
    },
    {
      total: attention.applications.total,
      more: "/admin/members",
      rows: attention.applications.items.map((application) => ({
        key: `application-${application.id}`,
        icon: UserPlus,
        text: say(strings.application.text, {
          name: application.name,
          chapter: application.chapterName,
        }),
        at: application.createdAt,
        href: link(`/admin/members/${application.userId}`, scopeQuery),
        action: strings.application.action,
      })),
    },
    {
      total: attention.awaitingFinish.total,
      more: "/admin/rides",
      rows: attention.awaitingFinish.items.map((ride) => ({
        key: `finish-${ride.id}`,
        icon: CircleCheckBig,
        text: say(strings.finish.text, { ride: headline(ride) }),
        at: ride.endsAt,
        href: link(`/admin/rides/${ride.id}`, scopeQuery),
        action: strings.finish.action,
      })),
    },
    {
      total: attention.damages.total,
      more: "/admin/trishaws",
      rows: attention.damages.items.map((damage) => ({
        key: `damage-${damage.id}`,
        icon: Wrench,
        text: say(strings.damage.text, {
          trishaw: damage.trishawName,
          description: damage.description,
        }),
        at: damage.reportedAt,
        badge: damage.grounding ? strings.damage.grounded : undefined,
        href: link(`/admin/trishaws/${damage.trishawId}`, scopeQuery),
        action: strings.damage.action,
      })),
    },
    {
      total: attention.notReady.total,
      more: "/admin/members",
      rows: attention.notReady.items.map((pilot) => ({
        key: `not-ready-${pilot.chapterId}-${pilot.userId}`,
        icon: GraduationCap,
        text: say(
          pilot.coursesDone
            ? strings.notReady.coursesDone
            : strings.notReady.text,
          { name: pilot.name ?? strings.notReady.someone },
        ),
        href: link(`/admin/members/${pilot.userId}`, scopeQuery),
        action: strings.notReady.action,
      })),
    },
  ];

  return groups.flatMap(({ rows, total, more }) =>
    total > rows.length
      ? [
          ...rows,
          {
            key: `more-${rows[0]?.key ?? more}`,
            href: link(more, scopeQuery),
            label: say(strings.more, { count: total - rows.length }),
          } satisfies More,
        ]
      : rows,
  );
}

export async function OverviewAttention({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ chapterIds, scopeQuery }, dict, language, head] = await Promise.all([
    readActiveScope(searchParams, "overview"),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const now = new Date();
  const attention = await needsAttention(chapterIds, now, language);
  const strings = dict.admin.overview.attention;
  const notation = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);

  if (attentionCount(attention) === 0)
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line px-5 py-12 text-center">
        <Character
          size={88}
          expression="heureux"
          follow={false}
          className="text-mint motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 motion-safe:duration-500"
        />
        <div className="flex flex-col gap-1">
          <p className="font-display text-base font-bold text-balance">
            {strings.empty.title}
          </p>
          <p className="max-w-xs text-2sm text-ink-soft">
            {strings.empty.body}
          </p>
        </div>
      </div>
    );

  const rows = rowsOf(attention, { dict, notation, words, scopeQuery });

  return (
    <ExpandableList
      words={words}
      labels={{
        showAll: dict.admin.overview.showAll,
        showLess: dict.admin.overview.showLess,
      }}
      className="rounded-2xl border border-line"
      items={rows.map((row) => ({
        key: row.key,
        node:
          "label" in row ? (
            <Link
              href={row.href}
              className="flex min-h-10 items-center px-4 py-2 pl-14 text-2sm text-ink-soft transition-colors hover:text-ink motion-reduce:transition-none"
            >
              {row.label}
            </Link>
          ) : (
            <div className="flex min-h-13 items-center gap-3 px-4 py-2">
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  TONE.get(row.icon) ?? "bg-mint-tint text-ink",
                )}
              >
                <row.icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="min-w-0 truncate text-2sm">{row.text}</p>
                <span className="flex shrink-0 items-center gap-2">
                  {row.badge ? (
                    <Badge
                      variant="outline"
                      className="border-line text-ink"
                    >
                      {row.badge}
                    </Badge>
                  ) : null}
                  {row.at ? (
                    <time
                      dateTime={row.at.toISOString()}
                      className="text-xs text-ink-soft tabular-nums"
                    >
                      {formatRelativeTime(row.at, words, now)}
                    </time>
                  ) : null}
                </span>
              </div>
              <Link
                href={row.href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "shrink-0 text-2sm",
                )}
              >
                {row.action}
              </Link>
            </div>
          ),
      }))}
    />
  );
}
