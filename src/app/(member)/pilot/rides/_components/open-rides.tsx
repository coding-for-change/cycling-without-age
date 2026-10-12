import Link from "next/link";
import { ChevronRight, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OpenRideRow } from "@/features/rides";
import { calendarDate } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";

export const pilotChapterIds = (access: {
  memberships: { chapterId: string; roles: string[] }[];
}) =>
  access.memberships
    .filter((membership) => membership.roles.includes("pilot"))
    .map((membership) => membership.chapterId);

/**
 * Lifecycle 3B-b: the rides a pilot could take, before they say yes. Each row
 * says when, where and how many ride along — never who.
 */
export function OpenRides({
  rides,
  dict,
  locale,
  words,
}: {
  rides: OpenRideRow[];
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  if (!rides.length) return null;
  const strings = dict.pilot.rides.open;
  const chapters = [...new Set(rides.map((ride) => ride.chapter.name))];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-ink-soft text-xs font-semibold tracking-wide uppercase">
          {chapters.length === 1
            ? formatMessage(strings.title, { chapter: chapters[0] }, words)
            : strings.titleAny}
        </h2>
        <p className="text-2sm text-ink-soft">{strings.hint}</p>
      </div>
      <ul className="border-line divide-line divide-y rounded-2xl border">
        {rides.map((ride) => {
          const zone = ride.chapter.timeZone;
          const missing = Math.max(
            0,
            ride.requiredPilots - ride._count.assignments,
          );
          return (
            <li key={ride.id}>
              <Link
                href={`/pilot/rides/${ride.id}`}
                transitionTypes={["push"]}
                className="hover:bg-canvas-deep flex min-h-14 items-center gap-3 px-4 py-3 transition-colors motion-reduce:transition-none"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-2sm text-ink-soft">
                    {formatShortDateWithWeekday(
                      calendarDate(ride.startsAt, zone),
                      locale,
                    )}
                    {" · "}
                    <time dateTime={ride.startsAt.toISOString()}>
                      {formatTimeRange(
                        ride.startsAt,
                        ride.endsAt,
                        locale,
                        zone,
                      )}
                    </time>
                  </span>
                  <span className="truncate font-medium">
                    {ride.title?.trim() || dict.calendar.models[ride.model]}
                  </span>
                  <span className="text-2sm text-ink-soft flex flex-wrap items-center gap-x-1.25">
                    {[
                      ride.locationName,
                      chapters.length > 1 ? ride.chapter.name : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    <span className="inline-flex items-center gap-1">
                      <UsersRound
                        aria-hidden
                        className="size-3.5"
                      />
                      {formatMessage(
                        strings.riders,
                        { count: ride._count.roster },
                        words,
                      )}
                    </span>
                  </span>
                </span>
                <Badge className="bg-mint-tint text-ink shrink-0">
                  {formatMessage(strings.needsMore, { count: missing }, words)}
                </Badge>
                <ChevronRight
                  aria-hidden
                  className="text-ink-soft size-4 shrink-0"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
