import Link from "next/link";
import {
  ArrowLeftRight,
  CircleCheck,
  GraduationCap,
  MapPinned,
  UsersRound,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { RichText } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chapters } from "@/features/chapters";
import { rides, type AnnouncedEventRow } from "@/features/rides";
import { rideHeadline } from "@/features/rides/components/ride-presentation";
import { formatRelativeTime, formatTimeRange, type Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { getOpenRide } from "@/use-cases/open-rides";
import { pilotReadiness } from "@/use-cases/pilot-readiness";
import { MemberTitle } from "../../../../_components/member-title";
import { EventHeader } from "../../../../_components/ride-detail/event-header";
import { EventHero } from "../../../../_components/ride-detail/event-hero";
import { PersonalHeader } from "../../../../_components/ride-detail/personal-header";
import { PlaceCard } from "../../../../_components/ride-detail/place-card";
import { SignUpButton } from "./sign-up-button";

/**
 * A ride the pilot is not on yet, as their chapter offers it: when, where,
 * what kind and how many ride along. Names, numbers and the pickup code come
 * only once they have signed up. Inside the staffing window it says so
 * first, because from then on stepping back is a call to the chapter. A ride
 * that filled up, moved or closed since the pilot was told about it says so
 * instead of a bare 404.
 */
export async function OpenRide({
  rideId,
  userId,
  pilotChapterIds,
  dict,
  locale,
  words,
}: {
  rideId: string;
  userId: string;
  pilotChapterIds: string[];
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  const ride = await getOpenRide(rideId, pilotChapterIds);
  const strings = dict.pilot.rides;
  if (!ride) {
    const event = await rides.getAnnouncedEvent(rideId, pilotChapterIds);
    if (event)
      return (
        <StaffedEvent
          event={event}
          dict={dict}
          locale={locale}
          words={words}
        />
      );
    return (
      <>
        <EmptyState
          icon={CircleCheck}
          title={strings.open.goneTitle}
          action={
            <Button
              asChild
              variant="outline"
            >
              <Link
                href="/pilot#open-rides"
                transitionTypes={["pop"]}
              >
                {strings.open.goneCta}
              </Link>
            </Button>
          }
        >
          {strings.open.goneBody}
        </EmptyState>
      </>
    );
  }

  const zone = ride.chapter.timeZone;
  const missing = Math.max(0, ride.requiredPilots - ride._count.assignments);
  const [settings, readiness] = await Promise.all([
    chapters.getSettings(ride.chapterId),
    pilotReadiness(userId, ride.chapterId),
  ]);
  const now = new Date();
  const late =
    now >=
    rides.withdrawalClosesAt(ride.startsAt, settings.staffingCheckLeadHours);
  const otherLeg = [ride.returnLeg, ride.returnLegOf].find(
    (leg) => leg?.status === "scheduled" && leg.startsAt > now,
  );

  const event = ride.model === "event";
  const headline = event
    ? ride.title?.trim() || dict.calendar.models.event
    : rideHeadline(ride, dict.calendar, {
        rideTo: dict.calendar.card.rideTo,
        rideFrom: dict.calendar.card.rideFrom,
        words,
      });
  const needs = (
    <Badge className="w-fit bg-mint-tint text-ink">
      {formatMessage(strings.open.needsMore, { count: missing }, words)}
    </Badge>
  );
  const relative = ` · ${formatRelativeTime(ride.startsAt, words, now)}`;

  return (
    <>
      <MemberTitle title={headline} />
      {event ? (
        <>
          <EventHero
            rideId={ride.id}
            title={headline}
            photos={ride.photos}
          />
          <EventHeader
            eyebrow={ride.chapter.name}
            title={headline}
            startsAt={ride.startsAt}
            endsAt={ride.endsAt}
            timeZone={zone}
            locale={locale}
            after={relative}
          />
          {needs}
        </>
      ) : (
        <PersonalHeader
          badge={needs}
          title={headline}
          startsAt={ride.startsAt}
          endsAt={ride.endsAt}
          timeZone={zone}
          locale={locale}
          after={relative}
        >
          <p className="text-2sm text-ink-soft">
            {[dict.calendar.models[ride.model], ride.chapter.name].join(" · ")}
          </p>
        </PersonalHeader>
      )}

      {ride.locationName?.trim() || ride.locationAddress?.trim() ? (
        <PlaceCard
          place={{
            name: ride.locationName,
            address: ride.locationAddress,
            latitude: ride.latitude,
            longitude: ride.longitude,
          }}
          mapOf={dict.passenger.rides.detail.mapOf}
          strings={dict.member.rides.map}
          words={words}
        />
      ) : (
        <p className="rounded-2xl border border-line p-4 text-2sm text-ink-soft">
          {strings.detail.noPlace}
        </p>
      )}

      {event && ride.description?.trim() ? (
        <RichText
          text={ride.description}
          className="text-base"
        />
      ) : null}

      <ul className="divide-y divide-line rounded-2xl border border-line">
        {ride.destinationName ? (
          <li className="flex min-h-12 items-start gap-3 px-4 py-3">
            <MapPinned
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-mint-ink"
            />
            <span>
              {formatMessage(
                strings.signUp.to,
                { destination: ride.destinationName },
                words,
              )}
            </span>
          </li>
        ) : null}
        {otherLeg ? (
          <li className="flex min-h-12 items-start gap-3 px-4 py-3">
            <ArrowLeftRight
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-ink-soft"
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
            className="size-4 shrink-0 text-ink-soft"
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

      <div className="mt-auto flex flex-col gap-3 pt-4">
        {readiness.ready ? (
          <SignUpButton
            rideId={ride.id}
            label={strings.signUp.cta}
            done={strings.signUp.done}
            errors={{ ...dict.common.errors, ...strings.errors }}
          />
        ) : (
          <>
            <p className="text-2sm text-ink-soft border-line flex items-start gap-3 rounded-2xl border p-4">
              <GraduationCap
                aria-hidden
                className="text-mint-ink mt-0.5 size-4 shrink-0"
              />
              <span>
                {formatMessage(
                  strings.signUp.notReady,
                  { chapter: ride.chapter.name },
                  words,
                )}
              </span>
            </p>
            <Button
              asChild
              variant="brand"
              size="hero"
            >
              <Link href="/pilot/training">{strings.signUp.notReadyCta}</Link>
            </Button>
          </>
        )}
      </div>
    </>
  );
}

/**
 * An announced event that already has its pilots: a pilot of the chapter may
 * still see what is planned, the way its riders do, but not sign up.
 */
function StaffedEvent({
  event,
  dict,
  locale,
  words,
}: {
  event: AnnouncedEventRow;
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  const headline = event.title?.trim() || dict.calendar.models.event;
  const relative = ` · ${formatRelativeTime(event.startsAt, words, new Date())}`;

  return (
    <>
      <MemberTitle title={headline} />
      <EventHero
        rideId={event.id}
        title={headline}
        photos={event.photos}
      />
      <EventHeader
        eyebrow={event.chapter.name}
        title={headline}
        startsAt={event.startsAt}
        endsAt={event.endsAt}
        timeZone={event.chapter.timeZone}
        locale={locale}
        after={relative}
      />
      <p className="rounded-2xl bg-canvas-deep p-4 text-2sm text-ink-soft">
        {dict.pilot.rides.open.staffed}
      </p>
      {event.locationName?.trim() || event.locationAddress?.trim() ? (
        <PlaceCard
          place={{
            name: event.locationName,
            address: event.locationAddress,
            latitude: event.latitude,
            longitude: event.longitude,
          }}
          mapOf={dict.passenger.rides.detail.mapOf}
          strings={dict.member.rides.map}
          words={words}
        />
      ) : null}
      {event.description?.trim() ? (
        <RichText
          text={event.description}
          className="text-base"
        />
      ) : null}
    </>
  );
}
