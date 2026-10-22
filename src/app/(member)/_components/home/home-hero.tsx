import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { passengers } from "@/features/passengers";
import { rides, type PassengerRideRow } from "@/features/rides";
import type { RideRequestRow } from "@/features/ride-requests";
import {
  rideHeadline,
  seatedPilots,
} from "@/features/rides/components/ride-presentation";
import { UpcomingRideCard } from "@/features/rides/components/upcoming-ride-card";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import {
  formatList,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { PERSPECTIVE_HOME, signInHref } from "@/lib/redirects";
import { firstName } from "@/lib/utils";
import {
  getPassengerAudience,
  type PassengerAudience,
} from "@/use-cases/passenger-audience";
import { primaryAction } from "../../nav";
import { loadRideRequests } from "../../passenger/rides/_components/ride-requests-list";
import { MEMBER_LIFE } from "../instant";
import { BookRideCard } from "./book-ride-card";
import { dayAndTime } from "./when";

const LOOKAHEAD_MS = 365 * 24 * 60 * 60 * 1000;
const RIDES_HREF = `${PERSPECTIVE_HOME.passenger}/rides`;

type Formatting = {
  dict: Dictionary;
  language: string;
  notation: Locale;
  words: Locale;
  now: Date;
};

export async function HomeHero() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict, language, head] = await Promise.all([
    perspectiveViewerSession("passenger"),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const { hero } = dict.member.home;
  const book = primaryAction("passenger").href;

  if (!session)
    return (
      <BookRideCard
        title={formatMessage(hero.bookTitle, { who: "self" }, language)}
        body={formatMessage(hero.bookBody, { who: "self" }, language)}
        action={dict.member.guest.hero}
        href={signInHref(book)}
        hint={dict.member.guest.heroHint}
      />
    );

  const now = new Date();
  const [riders, audience, requests] = await Promise.all([
    passengers.listRidersOfAccount(session.user.id),
    getPassengerAudience(session.user.id),
    loadRideRequests(session.user.id, now),
  ]);
  const upcoming = (
    await rides.listRidesForPassengers(
      riders.map((rider) => rider.id),
      now,
      new Date(now.getTime() + LOOKAHEAD_MS),
    )
  ).filter((ride) => ride.status !== "cancelled");
  const pending = requests
    .filter((request) => request.status === "pending")
    .sort(
      (a, b) => a.requestedStartsAt.getTime() - b.requestedStartsAt.getTime(),
    );
  const formatting: Formatting = {
    dict,
    language,
    notation: resolveLocale(head.get("accept-language")),
    words: wordsLocale(language),
    now,
  };

  const [next] = upcoming;
  const [request] = pending;
  const audienceValues = { who: audience.who, name: audience.name };

  if (!next && !request)
    return (
      <BookRideCard
        title={formatMessage(hero.bookTitle, audienceValues, language)}
        body={formatMessage(hero.bookBody, audienceValues, language)}
        action={dict.member.action.passenger}
        href={book}
      />
    );

  const more = next ? upcoming.length - 1 : pending.length - 1;

  return (
    <section className="flex flex-col gap-3">
      {next ? (
        <RideHero
          ride={next}
          audience={audience}
          formatting={formatting}
        />
      ) : (
        <RequestHero
          request={request}
          formatting={formatting}
        />
      )}
      {more > 0 ? (
        <Link
          href={RIDES_HREF}
          transitionTypes={["tab"]}
          className="flex min-h-11 w-fit items-center gap-1 self-end rounded-full px-3 text-2sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none motion-reduce:transition-none"
        >
          {formatMessage(hero.more, { count: more }, formatting.words)}
          <ChevronRight
            aria-hidden
            className="size-4"
          />
        </Link>
      ) : null}
      <Button
        asChild
        variant="brand"
        size="hero"
        className="mt-2 md:hidden"
      >
        <Link
          href={book}
          transitionTypes={["push"]}
        >
          {dict.member.action.passenger}
        </Link>
      </Button>
    </section>
  );
}

function RideHero({
  ride,
  audience,
  formatting: { dict, language, notation, words, now },
}: {
  ride: PassengerRideRow;
  audience: PassengerAudience;
  formatting: Formatting;
}) {
  const { hero } = dict.member.home;
  const zone = ride.chapter.timeZone;
  const pilots = seatedPilots(ride).map(({ user }) => firstName(user.name));
  const values = { who: audience.who, name: audience.name };

  return (
    <UpcomingRideCard
      href={`${PERSPECTIVE_HOME.passenger}/rides/${ride.id}`}
      eyebrow={
        pilots.length
          ? formatMessage(
              hero.eyebrow,
              { ...values, pilot: formatList(pilots, words) },
              language,
            )
          : formatMessage(hero.eyebrowNoPilot, values, language)
      }
      title={rideHeadline(ride, dict.calendar, {
        rideTo: dict.calendar.card.rideTo,
        rideFrom: dict.calendar.card.rideFrom,
        words,
      })}
      when={dayAndTime(hero.when, ride.startsAt, zone, notation, words)}
      now={now}
      startsAt={ride.startsAt}
      timeZone={zone}
      locale={notation}
      words={words}
      calendarLabels={dict.member.rides.countdown}
    />
  );
}

function RequestHero({
  request,
  formatting: { dict, notation, words, now },
}: {
  request: RideRequestRow;
  formatting: Formatting;
}) {
  const zone = request.chapter.timeZone;

  return (
    <UpcomingRideCard
      href={`${PERSPECTIVE_HOME.passenger}/rides/requests/${request.id}`}
      state="requested"
      eyebrow={dict.member.rides.upcoming.requested}
      title={rideHeadline(
        {
          model: request.model,
          title: null,
          locationName: request.pickupName,
          destinationName: request.destinationName,
        },
        dict.calendar,
        {
          rideTo: dict.calendar.card.rideTo,
          rideFrom: dict.calendar.card.rideFrom,
          words,
        },
      )}
      when={dayAndTime(
        dict.member.home.hero.when,
        request.requestedStartsAt,
        zone,
        notation,
        words,
      )}
      now={now}
      startsAt={request.requestedStartsAt}
      timeZone={zone}
      locale={notation}
      words={words}
      calendarLabels={dict.member.rides.countdown}
    />
  );
}
