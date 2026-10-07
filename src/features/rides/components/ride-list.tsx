"use client";

import Link from "next/link";
import {
  Fragment,
  ViewTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Bike, CalendarX2, TriangleAlert, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PersonAvatar } from "@/components/person-avatar";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { calendarDate, dayKey, addDays } from "@/lib/calendar";
import {
  formatLongDateWithWeekday,
  formatNumber,
  formatTime,
  type Locale,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { RideResult } from "../actions";
import type { ListRide, ListRidePage } from "./ride-list-rows";
import { MODEL_ICON, rideHeadline, rideWhere } from "./ride-presentation";

export type RideListStrings = {
  label: string;
  now: string;
  today: string;
  tomorrow: string;
  yesterday: string;
  count: string;
  empty: string;
  loadingMore: string;
  failed: string;
  retry: string;
  end: string;
  riders: string;
  ridersOf: string;
  pilotNeeded: string;
  noTrishaw: string;
  grounded: string;
  via: string;
  models: Record<ListRide["model"], string>;
  statuses: Record<ListRide["status"], string>;
};

type Props = {
  initial: ListRidePage;
  chapterIds: string[];
  timeZone: string;
  locale: Locale;
  words: Locale;
  now: Date;
  query: string;
  strings: RideListStrings;
  loadPage: (input: {
    chapterIds: string[];
    cursor: string;
  }) => Promise<RideResult<ListRidePage>>;
};

type Row = ListRide & { past: boolean };
type Section = { key: string; start: Date; rows: Row[] };

const AVATARS_SHOWN = 3;
const STICKY_TOP = "top-[calc(env(safe-area-inset-top,0px)+--spacing(12))]";

function sectionsOf(rows: Row[], timeZone: string): Section[] {
  const sections: Section[] = [];
  for (const row of rows) {
    const key = dayKey(row.startsAt, timeZone);
    const last = sections.at(-1);
    if (last?.key === key) last.rows.push(row);
    else sections.push({ key, start: row.startsAt, rows: [row] });
  }
  return sections;
}

const unique = (rows: ListRide[]) => {
  const seen = new Set<string>();
  return rows.filter((row) =>
    seen.has(row.id) ? false : (seen.add(row.id), true),
  );
};

export function RideList({
  initial,
  chapterIds,
  timeZone,
  locale,
  words,
  now,
  query,
  strings,
  loadPage,
}: Props) {
  const [upcoming, setUpcoming] = useState(initial.rides);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const sentinel = useRef<HTMLDivElement>(null);
  const nowLine = useRef<HTMLDivElement>(null);
  const loading = useRef(false);

  const past = initial.past;
  const rows: Row[] = [
    ...past.map((ride) => ({ ...ride, past: true })),
    ...upcoming.map((ride) => ({ ...ride, past: false })),
  ];
  const sections = sectionsOf(rows, timeZone);

  const load = useCallback(async () => {
    if (!cursor || loading.current) return;
    loading.current = true;
    setState("loading");
    const result = await loadPage({ chapterIds, cursor });
    loading.current = false;
    if (!result.ok) {
      setState("failed");
      return;
    }
    setUpcoming((current) => unique([...current, ...result.rides]));
    setCursor(result.nextCursor);
    setState("idle");
  }, [chapterIds, cursor, loadPage]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !cursor || state === "failed") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void load();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, load, state]);

  useEffect(() => {
    if (past.length) nowLine.current?.scrollIntoView({ block: "start" });
  }, [past.length]);

  const today = dayKey(now, timeZone);
  const relative = (key: string) =>
    key === today
      ? strings.today
      : key === dayKey(addDays(now, 1, timeZone), timeZone)
        ? strings.tomorrow
        : key === dayKey(addDays(now, -1, timeZone), timeZone)
          ? strings.yesterday
          : null;

  if (!rows.length)
    return <EmptyState icon={CalendarX2}>{strings.empty}</EmptyState>;

  const divider = (
    <div
      ref={nowLine}
      role="separator"
      aria-label={strings.now}
      className="flex scroll-mt-[calc(env(safe-area-inset-top,0px)+--spacing(20))] items-center gap-2 py-2"
    >
      <span
        aria-hidden
        className="bg-red size-2 shrink-0 rounded-full"
      />
      <span className="text-ink text-xs font-medium">{strings.now}</span>
      <span
        aria-hidden
        className="bg-red/60 h-px flex-1"
      />
    </div>
  );

  const firstUpcoming = upcoming[0]?.id;

  return (
    <section aria-label={strings.label}>
      {sections.map((section) => {
        const dividerAt = past.length
          ? section.rows.findIndex((row) => row.id === firstUpcoming)
          : -1;
        const sectionPast = section.rows.every((row) => row.past);
        const label = formatLongDateWithWeekday(
          calendarDate(section.start, timeZone),
          locale,
        );
        const near = relative(section.key);

        return (
          <Fragment key={section.key}>
            {dividerAt === 0 ? divider : null}
            <div
              className={cn(
                "bg-canvas/90 supports-[backdrop-filter]:bg-canvas/75 sticky z-10 -mx-4 flex h-8 items-center gap-2 px-4 backdrop-blur-md lg:-mx-6 lg:px-6",
                STICKY_TOP,
              )}
            >
              <h2
                className={cn(
                  "text-2sm font-medium",
                  sectionPast ? "text-ink-soft" : "text-ink",
                )}
              >
                {near ? (
                  <>
                    {near}
                    <span className="text-ink-soft font-normal">
                      {" · "}
                      {label}
                    </span>
                  </>
                ) : (
                  label
                )}
              </h2>
              <span className="text-ink-faint ml-auto text-xs tabular-nums">
                {formatMessage(
                  strings.count,
                  { count: section.rows.length },
                  words,
                )}
              </span>
            </div>
            <ul className="flex flex-col pb-2">
              {section.rows.map((row, index) => (
                <Fragment key={row.id}>
                  {index > 0 && index === dividerAt ? <li>{divider}</li> : null}
                  <li>
                    <RideRow
                      ride={row}
                      href={`/admin/rides/${row.id}${query}`}
                      timeZone={timeZone}
                      locale={locale}
                      words={words}
                      strings={strings}
                    />
                  </li>
                </Fragment>
              ))}
            </ul>
          </Fragment>
        );
      })}
      {past.length && !upcoming.length ? divider : null}

      <div
        ref={sentinel}
        aria-live="polite"
        className="flex min-h-12 flex-col justify-center gap-1.25 py-2"
      >
        {state === "loading" ? (
          <>
            <span className="sr-only">{strings.loadingMore}</span>
            <RideListRowsSkeleton rows={3} />
          </>
        ) : state === "failed" ? (
          <p className="text-2sm text-ink-soft flex items-center gap-2">
            {strings.failed}
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => {
                setState("idle");
                void load();
              }}
            >
              {strings.retry}
            </Button>
          </p>
        ) : !cursor && upcoming.length ? (
          <p className="text-ink-faint text-xs">{strings.end}</p>
        ) : null}
      </div>
    </section>
  );
}

function RideRow({
  ride,
  href,
  timeZone,
  locale,
  words,
  strings,
}: {
  ride: Row;
  href: string;
  timeZone: string;
  locale: Locale;
  words: Locale;
  strings: RideListStrings;
}) {
  const Icon = MODEL_ICON[ride.model];
  const cancelled = ride.status === "cancelled";
  const where = rideWhere(ride, strings);
  const title = rideHeadline(ride, strings);
  const subtitle = title === where ? null : where;
  const shown = ride.pilots.slice(0, AVATARS_SHOWN);
  const more = ride.pilots.length - shown.length;
  const missing = Math.max(0, ride.requiredPilots - ride.pilots.length);

  return (
    <Link
      href={href}
      className={cn(
        "hover:bg-canvas-deep focus-visible:ring-ring/50 -mx-2 grid h-9 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 text-2sm outline-none focus-visible:ring-2 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] lg:grid-cols-[auto_auto_minmax(0,1fr)_auto_10rem_auto]",
        ride.past && "opacity-60",
      )}
    >
      <span className="text-ink-soft w-24 tabular-nums max-sm:w-12">
        {formatTime(ride.startsAt, locale, timeZone)}
        <span className="max-sm:hidden">
          {" – "}
          {formatTime(ride.endsAt, locale, timeZone)}
        </span>
      </span>
      <Icon
        aria-label={strings.models[ride.model]}
        className="text-ink-soft size-3.5"
      />
      <span className="flex min-w-0 items-center gap-2">
        <ViewTransition name={`ride-title-${ride.id}`}>
          <span
            className={cn(
              "text-ink truncate font-medium",
              cancelled && "text-ink-soft line-through",
            )}
          >
            {title}
          </span>
        </ViewTransition>
        {subtitle ? (
          <span className="text-ink-soft truncate max-md:hidden">
            {subtitle}
          </span>
        ) : null}
        {ride.grounded ? (
          <TriangleAlert
            aria-label={strings.grounded}
            className="text-red-ink size-3.5 shrink-0"
          />
        ) : null}
        {ride.status !== "scheduled" ? (
          <span className="border-line text-ink-soft shrink-0 rounded-full border px-1.5 text-xs">
            {strings.statuses[ride.status]}
          </span>
        ) : null}
      </span>
      <span
        title={formatMessage(strings.riders, { count: ride.riders }, words)}
        className="text-ink-soft flex items-center gap-1 text-xs tabular-nums max-sm:hidden"
      >
        <Users
          aria-hidden
          className="size-3.5"
        />
        <span className="sr-only">
          {ride.capacity
            ? formatMessage(
                strings.ridersOf,
                { count: ride.riders, capacity: ride.capacity },
                words,
              )
            : formatMessage(strings.riders, { count: ride.riders }, words)}
        </span>
        <span aria-hidden>
          {formatNumber(ride.riders, locale)}
          {ride.capacity ? ` / ${formatNumber(ride.capacity, locale)}` : null}
        </span>
      </span>
      <span className="text-ink-soft flex min-w-0 items-center gap-1 text-xs max-lg:hidden">
        <Bike
          aria-hidden
          className="size-3.5 shrink-0"
        />
        <span className="truncate">
          {ride.trishaws.length ? ride.trishaws.join(", ") : strings.noTrishaw}
        </span>
      </span>
      <span className="flex w-16 justify-end">
        {shown.length ? (
          <AvatarGroup className="*:data-[slot=avatar]:ring-canvas">
            {shown.map((pilot) => (
              <span
                key={pilot.id}
                title={pilot.name}
                className="contents"
              >
                <PersonAvatar
                  svg={pilot.avatar}
                  size="sm"
                  className="size-5"
                />
              </span>
            ))}
            {more > 0 ? (
              <AvatarGroupCount className="size-5 text-xs">
                +{more}
              </AvatarGroupCount>
            ) : null}
          </AvatarGroup>
        ) : missing > 0 && !cancelled ? (
          <span
            title={strings.pilotNeeded}
            className="border-ink/30 size-5 rounded-full border border-dashed"
          >
            <span className="sr-only">{strings.pilotNeeded}</span>
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function RideListRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      aria-hidden
      className="flex flex-col"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex h-9 items-center gap-3"
        >
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="size-3.5 rounded-sm" />
          <Skeleton className={cn("h-3.5", i % 2 ? "w-40" : "w-56")} />
          <Skeleton className="ml-auto h-3.5 w-10 max-sm:hidden" />
          <Skeleton className="size-5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function RideListSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-2"
    >
      {[5, 3, 4].map((rows, i) => (
        <div
          key={i}
          className="flex flex-col"
        >
          <div className="flex h-8 items-center">
            <Skeleton className="h-4 w-48" />
          </div>
          <RideListRowsSkeleton rows={rows} />
        </div>
      ))}
    </div>
  );
}
