import Link from "next/link";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { ChevronRight, UsersRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { rideHeadline } from "@/features/rides/components/ride-presentation";
import { requirePerspective } from "@/lib/auth-guards";
import { calendarDate } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTime,
  resolveLocale,
  wordsLocale,
} from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { listOpenRides } from "@/use-cases/open-rides";
import { MEMBER_LIFE } from "../../_components/instant";
import { pilotChapterIds } from "../rides/_components/open-rides";

const RIDES_HREF = "/pilot/rides";

const SCROLLER =
  "-mx-4 -my-2 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-2 scrollbar-none lg:-mx-6 lg:scroll-px-6 lg:px-6";

export async function NeedsPilotCarousel() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  const [dict, language, head, open] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
    listOpenRides(session.user.id, pilotChapterIds(session.access)),
  ]);
  if (open.length === 0) return null;

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const strings = dict.pilot.home.open;
  const openStrings = dict.pilot.rides.open;
  const phrases = {
    rideTo: dict.calendar.card.rideTo,
    rideFrom: dict.calendar.card.rideFrom,
    words,
  };

  return (
    <section
      aria-labelledby="needs-pilot-title"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="needs-pilot-title"
          className="text-base tracking-tight"
        >
          {strings.title}
        </h2>
        <Link
          href={RIDES_HREF}
          transitionTypes={["tab"]}
          className="-mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-full px-2 text-2sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none motion-reduce:transition-none"
        >
          {strings.seeAll}
          <ChevronRight
            aria-hidden
            className="size-4"
          />
        </Link>
      </div>
      <ul className={SCROLLER}>
        {open.map((ride) => {
          const zone = ride.chapter.timeZone;
          const missing = Math.max(
            0,
            ride.requiredPilots - ride._count.assignments,
          );
          const place = ride.locationName?.trim() || null;
          return (
            <li
              key={ride.id}
              className="flex w-64 shrink-0 snap-start"
            >
              <Link
                href={`/pilot/rides/${ride.id}`}
                transitionTypes={["push"]}
                className="flex w-full flex-col gap-1.25 rounded-2xl border border-line bg-paper p-4 outline-none transition-[background-color,scale] hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink active:scale-99 motion-reduce:transition-none"
              >
                <span className="text-2sm text-ink-soft">
                  {formatShortDateWithWeekday(
                    calendarDate(ride.startsAt, zone),
                    locale,
                  )}
                  {" · "}
                  <time dateTime={ride.startsAt.toISOString()}>
                    {formatTime(ride.startsAt, locale, zone)}
                  </time>
                </span>
                <span className="line-clamp-2 font-display leading-snug font-bold tracking-tight text-balance">
                  {rideHeadline(ride, dict.calendar, phrases)}
                </span>
                {place ? (
                  <span className="truncate text-2sm text-ink-soft">
                    {place}
                  </span>
                ) : null}
                <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-2sm">
                  <span className="rounded-full bg-mint-tint px-2.5 py-0.5 font-medium text-ink">
                    {formatMessage(
                      openStrings.needsMore,
                      { count: missing },
                      words,
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 text-ink-soft">
                    <UsersRound
                      aria-hidden
                      className="size-3.5"
                    />
                    {formatMessage(
                      openStrings.riders,
                      { count: ride._count.roster },
                      words,
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function NeedsPilotCarouselFallback() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="grid w-64 shrink-0 gap-2 rounded-2xl border border-line bg-paper p-4"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-6 w-36 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
