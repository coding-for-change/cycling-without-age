"use client";

import Link from "next/link";
import {
  ViewTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronRight } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, calendarDate, dayKey } from "@/lib/calendar";
import {
  formatDurationLong,
  formatLongDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { listMyRidesPageAction, type RideResult } from "../actions";
import type { PassengerRideDirection } from "../schemas";
import type { YearInReview } from "../year-in-review";
import type {
  PassengerListPage,
  PassengerListRide,
} from "./passenger-ride-rows";
import {
  MODEL_ICON,
  rideHeadline,
  rideTone,
  rideWhere,
} from "./ride-presentation";

export type PassengerRideListStrings = {
  upcoming: string;
  past: string;
  showEarlier: string;
  loading: string;
  failed: string;
  retry: string;
  forRiders: string;
  pilot: string;
  pilotNeeded: string;
  now: string;
  today: string;
  tomorrow: string;
  yesterday: string;
  via: string;
  models: Record<PassengerListRide["model"], string>;
  statuses: Record<PassengerListRide["status"], string>;
  year: {
    title: string;
    rides: string;
    outside: string;
    pilots: string;
    favourite: string;
  };
};

type Props = {
  upcoming: PassengerListPage;
  past: PassengerListPage;
  year: YearInReview | null;
  showRiders: boolean;
  now: Date;
  locale: Locale;
  words: Locale;
  strings: PassengerRideListStrings;
};

type Day = {
  key: string;
  start: Date;
  zone: string;
  rides: PassengerListRide[];
};

const daysOf = (rides: PassengerListRide[]): Day[] => {
  const days: Day[] = [];
  for (const ride of rides) {
    const key = dayKey(ride.startsAt, ride.timeZone);
    const last = days.at(-1);
    if (last?.key === key) last.rides.push(ride);
    else
      days.push({
        key,
        start: ride.startsAt,
        zone: ride.timeZone,
        rides: [ride],
      });
  }
  return days;
};

function usePages(
  initial: PassengerListPage,
  direction: PassengerRideDirection,
) {
  const [rides, setRides] = useState(initial.rides);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!cursor || busy.current) return;
    busy.current = true;
    setState("loading");
    const result: RideResult<PassengerListPage> = await listMyRidesPageAction({
      direction,
      cursor,
    });
    busy.current = false;
    if (!result.ok) {
      setState("failed");
      return;
    }
    setRides((current) => {
      const seen = new Set(current.map((ride) => ride.id));
      return [...current, ...result.rides.filter((ride) => !seen.has(ride.id))];
    });
    setCursor(result.nextCursor);
    setState("idle");
  }, [cursor, direction]);

  return { rides, more: cursor !== null, state, load };
}

/**
 * A member's own rides: what is coming up first, soonest at the top and
 * loading on as they scroll, then what has been, behind a button — the past is
 * looked up, not browsed.
 */
export function PassengerRideList({
  upcoming: firstUpcoming,
  past: firstPast,
  year,
  showRiders,
  now,
  locale,
  words,
  strings,
}: Props) {
  const upcoming = usePages(firstUpcoming, "upcoming");
  const past = usePages(firstPast, "past");
  const sentinel = useRef<HTMLDivElement>(null);
  const { more, state, load } = upcoming;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !more || state !== "idle") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void load();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [more, state, load]);

  const near = (day: Day) => {
    if (day.key === dayKey(now, day.zone)) return strings.today;
    if (day.key === dayKey(addDays(now, 1, day.zone), day.zone))
      return strings.tomorrow;
    if (day.key === dayKey(addDays(now, -1, day.zone), day.zone))
      return strings.yesterday;
    return null;
  };

  const renderDays = (rides: PassengerListRide[], faded: boolean) =>
    daysOf(rides).map((day) => {
      const date = formatLongDateWithWeekday(
        calendarDate(day.start, day.zone),
        locale,
      );
      const relative = near(day);
      return (
        <div
          key={day.key}
          className="flex flex-col gap-2"
        >
          <h3 className="text-sm font-medium text-ink">
            {relative ? (
              <>
                {relative}
                <span className="font-normal text-ink-soft">
                  {" · "}
                  {date}
                </span>
              </>
            ) : (
              date
            )}
          </h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {day.rides.map((ride) => (
              <li key={ride.id}>
                <RideRow
                  ride={ride}
                  faded={faded}
                  showRiders={showRiders}
                  now={now}
                  locale={locale}
                  words={words}
                  strings={strings}
                />
              </li>
            ))}
          </ul>
        </div>
      );
    });

  return (
    <div className="flex flex-col gap-8">
      {upcoming.rides.length ? (
        <section
          aria-labelledby="rides-upcoming"
          className="flex flex-col gap-4"
        >
          <h2
            id="rides-upcoming"
            className="text-xs font-semibold tracking-wide text-ink-soft uppercase"
          >
            {strings.upcoming}
          </h2>
          {renderDays(upcoming.rides, false)}
          <div
            ref={sentinel}
            aria-live="polite"
          >
            <PageState
              pages={upcoming}
              strings={strings}
            />
          </div>
        </section>
      ) : null}

      {past.rides.length ? (
        <section
          aria-labelledby="rides-past"
          className="flex flex-col gap-4"
        >
          <h2
            id="rides-past"
            className="text-xs font-semibold tracking-wide text-ink-soft uppercase"
          >
            {strings.past}
          </h2>
          {year ? (
            <YearCard
              year={year}
              strings={strings.year}
              words={words}
            />
          ) : null}
          {renderDays(past.rides, true)}
          <div aria-live="polite">
            {past.more && past.state === "idle" ? (
              <Button
                variant="outline"
                className="min-h-11 w-full rounded-full border-line"
                onClick={() => void past.load()}
              >
                {strings.showEarlier}
              </Button>
            ) : (
              <PageState
                pages={past}
                strings={strings}
              />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PageState({
  pages,
  strings,
}: {
  pages: ReturnType<typeof usePages>;
  strings: PassengerRideListStrings;
}) {
  if (pages.state === "loading")
    return (
      <div className="flex flex-col gap-2">
        <span className="sr-only">{strings.loading}</span>
        <Skeleton className="h-21 rounded-2xl" />
        <Skeleton className="h-21 rounded-2xl" />
      </div>
    );
  if (pages.state === "failed")
    return (
      <p className="flex items-center gap-3 text-sm text-ink-soft">
        {strings.failed}
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-line"
          onClick={() => void pages.load()}
        >
          {strings.retry}
        </Button>
      </p>
    );
  return null;
}

function RideRow({
  ride,
  faded,
  showRiders,
  now,
  locale,
  words,
  strings,
}: {
  ride: PassengerListRide;
  faded: boolean;
  showRiders: boolean;
  now: Date;
  locale: Locale;
  words: Locale;
  strings: PassengerRideListStrings;
}) {
  const Icon = MODEL_ICON[ride.model];
  const cancelled = ride.status === "cancelled";
  const running =
    ride.status === "scheduled" &&
    ride.startsAt.getTime() <= now.getTime() &&
    ride.endsAt.getTime() > now.getTime();
  const headline = rideHeadline(ride, strings);
  const where = rideWhere(ride, strings);
  const [pilot, ...others] = ride.pilots;

  return (
    <Link
      href={`/passenger/rides/${ride.id}`}
      transitionTypes={["push"]}
      className={cn(
        "flex items-center gap-3.5 px-4 py-3.5 outline-none transition-colors hover:bg-canvas-deep focus-visible:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none",
        faded && "text-ink-soft",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-13 shrink-0 items-center justify-center rounded-xl border",
          rideTone(ride),
          faded && !cancelled && "opacity-70",
        )}
      >
        <Icon className="size-5" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
          <time
            dateTime={ride.startsAt.toISOString()}
            className={cn("tabular-nums", cancelled && "line-through")}
          >
            {formatTimeRange(ride.startsAt, ride.endsAt, locale, ride.timeZone)}
          </time>
          <span aria-hidden>·</span>
          <span>{strings.models[ride.model]}</span>
          {cancelled ? (
            <span className="rounded-full bg-canvas-deeper px-2 text-xs font-medium text-ink">
              {strings.statuses.cancelled}
            </span>
          ) : running ? (
            <span className="rounded-full bg-mint-deep px-2 text-xs font-medium text-white">
              {strings.now}
            </span>
          ) : null}
        </span>

        <ViewTransition name={`passenger-ride-title-${ride.id}`}>
          <span
            className={cn(
              "truncate font-display text-base",
              cancelled ? "text-ink-soft" : "text-ink",
            )}
          >
            {headline}
          </span>
        </ViewTransition>
        {where && where !== headline ? (
          <span className="truncate text-sm text-ink-soft">{where}</span>
        ) : null}

        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          {pilot ? (
            <span className="flex min-w-0 items-center gap-2">
              <PersonAvatar
                svg={pilot.avatar}
                size="sm"
              />
              <span className="truncate">
                {formatMessage(
                  strings.pilot,
                  {
                    name: [pilot, ...others].map((p) => p.name).join(", "),
                  },
                  words,
                )}
              </span>
            </span>
          ) : cancelled ? null : (
            <span>{strings.pilotNeeded}</span>
          )}
          {showRiders && ride.riders.length ? (
            <span className="truncate">
              {formatMessage(
                strings.forRiders,
                { names: ride.riders.join(", ") },
                words,
              )}
            </span>
          ) : null}
        </span>
      </span>

      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-ink-faint"
      />
    </Link>
  );
}

/**
 * The year so far, told the way a postcard would: how often, how long out in
 * the open, with how many pilots, and the place they kept coming back to.
 */
function YearCard({
  year,
  strings,
  words,
}: {
  year: YearInReview;
  strings: PassengerRideListStrings["year"];
  words: Locale;
}) {
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, words);
  const facts = [
    say(strings.rides, { count: year.rides }),
    say(strings.outside, {
      duration: formatDurationLong(year.seconds, words),
    }),
    ...(year.pilots ? [say(strings.pilots, { count: year.pilots })] : []),
  ];

  return (
    <article className="relative overflow-hidden rounded-(--r-tile) bg-mint-tint p-5">
      <div
        aria-hidden
        className="diagonal-edge absolute inset-x-0 top-0 h-20 bg-mint"
      />
      <div className="relative flex flex-col gap-4">
        <h3 className="text-xl">{say(strings.title, { year: year.year })}</h3>
        <ul className="flex flex-wrap gap-2">
          {facts.map((fact) => (
            <li
              key={fact}
              className="rounded-full bg-canvas px-4 py-2 text-base font-medium"
            >
              {fact}
            </li>
          ))}
        </ul>
        {year.favouritePlace ? (
          <p className="text-base">
            {say(strings.favourite, { place: year.favouritePlace })}
          </p>
        ) : null}
      </div>
    </article>
  );
}
