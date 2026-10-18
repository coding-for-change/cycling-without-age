"use client";

import Link from "next/link";
import {
  ViewTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronRight, MapPin } from "lucide-react";
import { Hero } from "@/components/art";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, calendarDate, dayKey } from "@/lib/calendar";
import {
  formatDayMonthShort,
  formatDurationLong,
  formatList,
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
import { MODEL_ICON, rideHeadline, rideWhere } from "./ride-presentation";

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

  const near = (ride: PassengerListRide) => {
    const key = dayKey(ride.startsAt, ride.timeZone);
    if (key === dayKey(now, ride.timeZone)) return strings.today;
    if (key === dayKey(addDays(now, 1, ride.timeZone), ride.timeZone))
      return strings.tomorrow;
    return null;
  };

  return (
    <div className="flex flex-col gap-8">
      {upcoming.rides.length ? (
        <section
          aria-labelledby="rides-upcoming"
          className="flex flex-col gap-4"
        >
          <h2
            id="rides-upcoming"
            className="text-2xl"
          >
            {strings.upcoming}
          </h2>
          <ul className="flex flex-col gap-3">
            {upcoming.rides.map((ride, index) => (
              <li
                key={ride.id}
                className="reveal"
                style={{ "--i": index } as React.CSSProperties}
              >
                <UpcomingCard
                  ride={ride}
                  relative={near(ride)}
                  showRiders={showRiders}
                  now={now}
                  locale={locale}
                  words={words}
                  strings={strings}
                />
              </li>
            ))}
          </ul>
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
            className="text-2xl"
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
          <ul className="flex flex-col gap-2">
            {past.rides.map((ride) => (
              <li key={ride.id}>
                <PastRow
                  ride={ride}
                  locale={locale}
                  strings={strings}
                />
              </li>
            ))}
          </ul>
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
          className="min-h-11 rounded-full border-line"
          onClick={() => void pages.load()}
        >
          {strings.retry}
        </Button>
      </p>
    );
  return null;
}

const badge =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold";

function StatusBadge({
  ride,
  now,
  strings,
}: {
  ride: PassengerListRide;
  now: Date;
  strings: PassengerRideListStrings;
}) {
  const running =
    ride.status === "scheduled" &&
    ride.startsAt.getTime() <= now.getTime() &&
    ride.endsAt.getTime() > now.getTime();
  if (ride.status === "cancelled")
    return (
      <span
        className={cn(badge, "border-transparent bg-grey-tint text-ink-soft")}
      >
        {strings.statuses.cancelled}
      </span>
    );
  if (running)
    return (
      <span className={cn(badge, "border-transparent bg-mint-deep text-white")}>
        {strings.now}
      </span>
    );
  if (ride.endsAt.getTime() <= now.getTime())
    return (
      <span className={cn(badge, "border-transparent bg-grey-tint text-ink")}>
        {strings.statuses.completed}
      </span>
    );
  return (
    <span className={cn(badge, "border-transparent bg-mint-tint text-ink")}>
      {strings.statuses.scheduled}
    </span>
  );
}

const card =
  "flex items-center gap-3.5 rounded-soft border border-line bg-paper shadow-soft outline-none transition-[transform,border-color] hover:border-ink/30 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-99 motion-reduce:transition-none";

/** A ride to come, as mockup 2 draws it: what kind, how it stands, when, where, who pedals. */
function UpcomingCard({
  ride,
  relative,
  showRiders,
  now,
  locale,
  words,
  strings,
}: {
  ride: PassengerListRide;
  relative: string | null;
  showRiders: boolean;
  now: Date;
  locale: Locale;
  words: Locale;
  strings: PassengerRideListStrings;
}) {
  const Icon = MODEL_ICON[ride.model];
  const cancelled = ride.status === "cancelled";
  const headline = rideHeadline(ride, strings);
  const where = rideWhere(ride, strings);
  const [pilot] = ride.pilots;
  const date = formatLongDateWithWeekday(
    calendarDate(ride.startsAt, ride.timeZone),
    locale,
  );

  return (
    <Link
      href={`/passenger/rides/${ride.id}`}
      transitionTypes={["push"]}
      className={cn(card, "p-5")}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex flex-wrap items-center gap-1.25">
          <span className={cn(badge, "border-line text-ink-soft")}>
            <Icon
              aria-hidden
              className="size-3"
            />
            {strings.models[ride.model]}
          </span>
          <StatusBadge
            ride={ride}
            now={now}
            strings={strings}
          />
          {relative ? (
            <span className={cn(badge, "border-line text-ink-soft")}>
              {relative}
            </span>
          ) : null}
        </span>

        <time
          dateTime={ride.startsAt.toISOString()}
          className={cn(
            "display-title text-xl",
            cancelled && "text-ink-soft line-through",
          )}
        >
          {date} ·{" "}
          {formatTimeRange(ride.startsAt, ride.endsAt, locale, ride.timeZone)}
        </time>

        <ViewTransition name={`passenger-ride-title-${ride.id}`}>
          <span className="truncate text-base">{headline}</span>
        </ViewTransition>
        {where && where !== headline ? (
          <span className="flex min-w-0 items-center gap-1.25 text-sm text-ink-soft">
            <MapPin
              aria-hidden
              className="size-3.5 shrink-0"
            />
            <span className="truncate">{where}</span>
          </span>
        ) : null}

        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {pilot ? (
            <span className="flex min-w-0 items-center gap-2 font-bold">
              <PersonAvatar
                svg={pilot.avatar}
                size="lg"
              />
              <span className="truncate">
                {formatList(
                  ride.pilots.map((p) => p.name),
                  words,
                )}
              </span>
            </span>
          ) : cancelled ? null : (
            <span className="text-ink-soft">{strings.pilotNeeded}</span>
          )}
          {showRiders && ride.riders.length ? (
            <span className="truncate text-ink-soft">
              {formatMessage(
                strings.forRiders,
                { names: formatList(ride.riders, words) },
                words,
              )}
            </span>
          ) : null}
        </span>
      </span>

      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-ink-soft"
      />
    </Link>
  );
}

/** A ride that has been: one compact line, the way mockup 2 lists the past. */
function PastRow({
  ride,
  locale,
  strings,
}: {
  ride: PassengerListRide;
  locale: Locale;
  strings: PassengerRideListStrings;
}) {
  const Icon = MODEL_ICON[ride.model];
  return (
    <Link
      href={`/passenger/rides/${ride.id}`}
      transitionTypes={["push"]}
      className={cn(card, "min-h-14 px-5 py-3 text-ink-soft")}
    >
      <Icon
        aria-hidden
        className="size-4 shrink-0"
      />
      <span className="min-w-0 flex-1 truncate">
        <time dateTime={ride.startsAt.toISOString()}>
          {formatDayMonthShort(
            calendarDate(ride.startsAt, ride.timeZone),
            locale,
          )}
        </time>
        {" · "}
        {strings.models[ride.model]}
      </span>
      <span
        className={cn(
          badge,
          "border-transparent bg-grey-tint",
          ride.status === "cancelled" ? "text-ink-soft" : "text-ink",
        )}
      >
        {ride.status === "cancelled"
          ? strings.statuses.cancelled
          : strings.statuses.completed}
      </span>
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
      <Hero
        name="celebrate"
        className="pointer-events-none absolute -top-2.75 -right-4 w-36"
      />
      <div className="relative flex flex-col gap-4">
        <h3 className="display-title max-w-[70%] text-2xl">
          {say(strings.title, { year: year.year })}
        </h3>
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
