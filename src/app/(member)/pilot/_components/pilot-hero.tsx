import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { countdownOf } from "@/components/illustrations/countdown";
import { Skeleton } from "@/components/ui/skeleton";
import { profile } from "@/features/profile";
import { rides, type PilotRideRow } from "@/features/rides";
import { rideHeadline } from "@/features/rides/components/ride-presentation";
import { UpcomingRideCard } from "@/features/rides/components/upcoming-ride-card";
import { requirePerspective } from "@/lib/auth-guards";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { calendarDate } from "@/lib/calendar";
import {
  formatList,
  formatRelativeTime,
  formatShortDateWithWeekday,
  formatTime,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MEMBER_LIFE } from "../../_components/instant";
import { SetupRow } from "../../_components/home/setup-checklist";
import { TodayRideCard, type TodayRider } from "./today-ride-card";
import { trainingOpen } from "./training-state";

const HORIZON_MS = 28 * 24 * 60 * 60 * 1000;

type HeroRide = Pick<
  PilotRideRow,
  | "id"
  | "model"
  | "status"
  | "title"
  | "startsAt"
  | "endsAt"
  | "locationName"
  | "locationAddress"
  | "destinationName"
  | "chapter"
  | "roster"
>;

export async function PilotHero() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  const userId = session.user.id;
  const [dict, language, head] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
  ]);

  if (await trainingOpen(userId, language))
    return (
      <SetupRow
        perspective="pilot"
        variant="hero"
      />
    );

  const now = new Date();
  const [latest, upcoming] = await Promise.all([
    rides.latestRideForPilot(userId, now),
    rides.listRidesForPilot(userId, now, new Date(now.getTime() + HORIZON_MS)),
  ]);
  const ahead = upcoming.filter(
    (ride) => ride.status !== "cancelled" && ride.endsAt > now,
  );
  const today = ahead.find(
    (ride) =>
      ride.startsAt <= now ||
      countdownOf(now, ride.startsAt, ride.chapter.timeZone).kind === "today",
  );
  const awaitingFinish =
    latest && latest.id !== today?.id && latest.endsAt <= now ? latest : null;

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const view = { dict, locale, words, now, userId };

  if (today || awaitingFinish)
    return (
      <div className="flex flex-col gap-3">
        {today ? (
          <TodayCard
            ride={today}
            view={view}
          />
        ) : null}
        {awaitingFinish ? (
          <TodayCard
            ride={awaitingFinish}
            view={view}
          />
        ) : null}
      </div>
    );

  const next = ahead[0];
  if (!next) return null;
  const zone = next.chapter.timeZone;

  return (
    <UpcomingRideCard
      href={`/pilot/rides/${next.id}`}
      eyebrow={dict.pilot.home.next.eyebrow}
      title={headlineOf(next, dict, words)}
      when={`${formatShortDateWithWeekday(calendarDate(next.startsAt, zone), locale)} · ${formatTime(next.startsAt, locale, zone)}`}
      now={now}
      startsAt={next.startsAt}
      timeZone={zone}
      locale={locale}
      words={words}
      calendarLabels={dict.member.rides.countdown}
    />
  );
}

type HeroView = {
  dict: Dictionary;
  locale: Locale;
  words: Locale;
  now: Date;
  userId: string;
};

const headlineOf = (ride: HeroRide, dict: Dictionary, words: Locale) =>
  rideHeadline(ride, dict.calendar, {
    rideTo: dict.calendar.card.rideTo,
    rideFrom: dict.calendar.card.rideFrom,
    words,
  });

async function TodayCard({ ride, view }: { ride: HeroRide; view: HeroView }) {
  const { dict, locale, words, now, userId } = view;
  const strings = dict.pilot.home.today;
  const zone = ride.chapter.timeZone;
  const accountIds = ride.roster.flatMap((entry) =>
    entry.passenger?.userId ? [entry.passenger.userId] : [],
  );
  const [detail, accounts] = await Promise.all([
    rides.getRideForPilot(ride.id, userId),
    profile.getProfiles(accountIds),
  ]);
  const emails = new Map(
    accounts.map((account) => [account.id, account.email]),
  );

  const riders: TodayRider[] = ride.roster.map((entry) => {
    const { passenger } = entry;
    const email = passenger?.userId ? emails.get(passenger.userId) : undefined;
    const seed = email
      ? avatarSeed(email)
      : passenger
        ? `passenger:${passenger.id}`
        : `guest:${entry.id}`;
    return {
      key: entry.id,
      name: passenger?.firstName ?? entry.guestName ?? "",
      avatar: avatarSvg(seed),
    };
  });
  const names = riders.map((rider) => rider.name).filter(Boolean);

  const over = ride.endsAt <= now;
  const running = !over && ride.startsAt <= now;
  const eyebrow = over
    ? formatMessage(
        strings.ended,
        { when: formatRelativeTime(ride.endsAt, words, now) },
        words,
      )
    : formatMessage(
        running ? strings.now : strings.upcoming,
        {
          time: formatTime(running ? ride.endsAt : ride.startsAt, locale, zone),
        },
        words,
      );

  const name = ride.locationName?.trim() || null;
  const address =
    detail?.locationAddress?.trim() || ride.locationAddress?.trim() || null;
  const latitude = detail?.latitude ?? null;
  const longitude = detail?.longitude ?? null;
  const navigable =
    address !== null || (latitude !== null && longitude !== null);

  return (
    <TodayRideCard
      href={`/pilot/rides/${ride.id}`}
      finishHref={over ? `/pilot/rides/${ride.id}/finish` : null}
      eyebrow={eyebrow}
      live={running}
      title={headlineOf(ride, dict, words)}
      riders={riders}
      ridersLine={
        names.length > 0
          ? formatList(names, locale)
          : formatMessage(strings.riders, { count: riders.length }, words)
      }
      place={navigable ? { name, address, latitude, longitude } : null}
      placeLine={[name, address].filter(Boolean).join(" · ") || null}
      finishHint={dict.fleet.finish.homeCard.body}
      strings={strings}
      mapStrings={dict.member.rides.map}
      words={words}
    />
  );
}

export async function PilotSetupRow() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  const language = await getLocale();
  if (await trainingOpen(session.user.id, language)) return null;
  return <SetupRow perspective="pilot" />;
}

export function PilotHeroFallback() {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-paper p-5 shadow-lift">
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-52 max-w-full" />
        <Skeleton className="mt-1 h-4 w-36" />
      </div>
      <Skeleton className="h-20 w-18 shrink-0 rounded-xl" />
    </div>
  );
}
