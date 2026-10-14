import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarClock,
  MapPin,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { chapters } from "@/features/chapters";
import { rides } from "@/features/rides";
import { calendarDate } from "@/lib/calendar";
import {
  formatRelativeTime,
  formatShortDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { getOpenRide } from "@/use-cases/open-rides";
import { SignUpButton } from "./sign-up-button";

/**
 * A ride the pilot is not on yet, as their chapter offers it: when, where,
 * what kind and how many ride along. Names, numbers and the pickup code come
 * only once they have signed up. Inside the staffing window it says so
 * first, because from then on stepping back is a call to the chapter.
 */
export async function OpenRide({
  rideId,
  pilotChapterIds,
  dict,
  locale,
  words,
}: {
  rideId: string;
  pilotChapterIds: string[];
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  const ride = await getOpenRide(rideId, pilotChapterIds);
  if (!ride) notFound();

  const strings = dict.pilot.rides;
  const zone = ride.chapter.timeZone;
  const missing = Math.max(0, ride.requiredPilots - ride._count.assignments);
  const settings = await chapters.getSettings(ride.chapterId);
  const now = new Date();
  const late =
    now >=
    rides.withdrawalClosesAt(ride.startsAt, settings.staffingCheckLeadHours);
  const otherLeg = [ride.returnLeg, ride.returnLegOf].find(
    (leg) => leg?.status === "scheduled" && leg.startsAt > now,
  );

  return (
    <>
      <Link
        href="/pilot/rides"
        transitionTypes={["pop"]}
        className="text-2sm text-ink-soft hover:text-ink -my-2 inline-flex min-h-11 w-fit items-center gap-1.25 rounded-md transition-colors motion-reduce:transition-none"
      >
        <ArrowLeft
          aria-hidden
          className="size-4"
        />
        {strings.detail.back}
      </Link>

      <header className="flex flex-col gap-1.25">
        <Badge className="bg-mint-tint text-ink w-fit">
          {formatMessage(strings.open.needsMore, { count: missing }, words)}
        </Badge>
        <h1 className="text-2xl tracking-tight md:text-3xl">
          {ride.title?.trim() || dict.calendar.models[ride.model]}
        </h1>
        <p className="text-ink-soft flex flex-wrap items-center gap-x-1.25">
          <CalendarClock
            aria-hidden
            className="size-4 shrink-0"
          />
          <span>
            {formatShortDateWithWeekday(
              calendarDate(ride.startsAt, zone),
              locale,
            )}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={ride.startsAt.toISOString()}>
            {formatTimeRange(ride.startsAt, ride.endsAt, locale, zone)}
          </time>
          <span aria-hidden>·</span>
          <span>{formatRelativeTime(ride.startsAt, words, now)}</span>
        </p>
        <p className="text-2sm text-ink-soft">
          {[dict.calendar.models[ride.model], ride.chapter.name].join(" · ")}
        </p>
      </header>

      <ul className="border-line divide-line divide-y rounded-2xl border">
        <li className="flex min-h-12 items-start gap-3 px-4 py-3">
          <MapPin
            aria-hidden
            className="text-mint-deep mt-0.5 size-4 shrink-0"
          />
          <span className="flex min-w-0 flex-col">
            <span>{ride.locationName ?? strings.detail.noPlace}</span>
            {ride.locationAddress ? (
              <span className="text-2sm text-ink-soft">
                {ride.locationAddress}
              </span>
            ) : null}
            {ride.destinationName ? (
              <span className="text-2sm text-ink-soft">
                {formatMessage(
                  strings.signUp.to,
                  { destination: ride.destinationName },
                  words,
                )}
              </span>
            ) : null}
          </span>
        </li>
        {otherLeg ? (
          <li className="flex min-h-12 items-start gap-3 px-4 py-3">
            <ArrowLeftRight
              aria-hidden
              className="text-ink-soft mt-0.5 size-4 shrink-0"
            />
            <span>
              {formatMessage(
                otherLeg === ride.returnLeg
                  ? strings.signUp.alsoWayBack
                  : strings.signUp.alsoWayThere,
                {
                  time: formatTimeRange(
                    otherLeg.startsAt,
                    otherLeg.endsAt,
                    locale,
                    zone,
                  ),
                },
                words,
              )}
            </span>
          </li>
        ) : null}
        <li className="flex min-h-12 items-center gap-3 px-4 py-3">
          <UsersRound
            aria-hidden
            className="text-ink-soft size-4 shrink-0"
          />
          <span>
            {formatMessage(
              strings.open.riders,
              { count: ride._count.roster },
              words,
            )}
          </span>
        </li>
      </ul>

      <p className="text-sm">
        {formatMessage(
          strings.signUp.intro,
          { chapter: ride.chapter.name },
          words,
        )}
      </p>

      {late ? (
        <p className="text-2sm text-ink-soft border-line rounded-2xl border p-4">
          {formatMessage(
            strings.signUp.late,
            {
              hours: settings.staffingCheckLeadHours,
              chapter: ride.chapter.name,
            },
            words,
          )}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col pt-4">
        <SignUpButton
          rideId={ride.id}
          label={strings.signUp.cta}
          done={strings.signUp.done}
          errors={{ ...dict.common.errors, ...strings.errors }}
        />
      </div>
    </>
  );
}
