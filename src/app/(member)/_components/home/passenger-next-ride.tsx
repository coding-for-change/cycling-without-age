import Link from "next/link";
import { ArrowRight, Bike, Clock, Search } from "lucide-react";
import { Scene } from "@/components/art";
import { HeroButton } from "@/components/hero-button";
import { PersonAvatar } from "@/components/person-avatar";
import type { RideCalendarRow } from "@/features/rides";
import { RideAgenda } from "@/features/rides/components/ride-agenda";
import { avatarSvg, seedOf } from "@/lib/avatar";
import {
  formatLongDateWithWeekday,
  formatRelativeTime,
  formatTime,
  type Locale,
} from "@/lib/format";
import { dayKey } from "@/lib/calendar";
import { formatMessage } from "@/lib/i18n/format";
import { firstName } from "@/lib/utils";

type Strings = {
  book: string;
  eyebrow: string;
  pickupAt: string;
  pilotPicksYou: string;
  lookingPilot: string;
  later: string;
  emptyTitle: string;
  empty: string;
  open: string;
  agenda: Parameters<typeof RideAgenda>[0]["strings"];
};

/**
 * A passenger's home in mockup 2's shape: the booking pill — red while nothing
 * is booked, dark mint once a ride is coming — then the very next ride as a
 * dark tile, and the rest of the coming weeks as main's agenda below it.
 */
export function PassengerNextRide({
  upcoming,
  bookHref,
  strings,
  notation,
  words,
  profileBase,
  now,
}: {
  upcoming: RideCalendarRow[];
  bookHref: string;
  strings: Strings;
  notation: Locale;
  words: Locale;
  profileBase: string;
  now: Date;
}) {
  const coming = upcoming.filter(
    (ride) => ride.status !== "cancelled" && ride.endsAt > now,
  );
  const [next, ...later] = coming;
  const say = (template: string, values: Record<string, string>) =>
    formatMessage(template, values, words);

  return (
    <section className="flex flex-col gap-5">
      <HeroButton
        href={bookHref}
        label={strings.book}
        icon={Bike}
        tone={next ? "deep" : "red"}
        className="reveal [--i:1] md:hidden"
      />

      {next ? (
        <NextRideTile
          ride={next}
          strings={strings}
          notation={notation}
          words={words}
          now={now}
          say={say}
        />
      ) : (
        <div className="reveal relative overflow-hidden rounded-(--r-tile) bg-mint-tint [--i:2]">
          <Scene
            name="park"
            className="aspect-5/2 w-full"
          />
          <div className="flex flex-col gap-1.25 p-5">
            <p className="display-title text-2xl">{strings.emptyTitle}</p>
            <p className="text-ink-soft">{strings.empty}</p>
          </div>
        </div>
      )}

      {later.length ? (
        <div className="reveal flex flex-col gap-3 [--i:3]">
          <h2 className="eyebrow">{strings.later}</h2>
          <RideAgenda
            rides={later}
            strings={strings.agenda}
            locale={notation}
            words={words}
            profileBase={profileBase}
          />
        </div>
      ) : null}
    </section>
  );
}

function NextRideTile({
  ride,
  strings,
  notation,
  words,
  now,
  say,
}: {
  ride: RideCalendarRow;
  strings: Strings;
  notation: Locale;
  words: Locale;
  now: Date;
  say: (template: string, values: Record<string, string>) => string;
}) {
  const zone = ride.chapter.timeZone;
  const pilot = ride.assignments.find(({ role }) => role === "pilot")?.user;
  const place = ride.locationName ?? ride.locationAddress;
  const when = `${formatLongDateWithWeekday(
    dayKey(ride.startsAt, zone),
    notation,
  )} · ${formatTime(ride.startsAt, notation, zone)}`;

  return (
    <Link
      href={`/passenger/rides/${ride.id}`}
      transitionTypes={["push"]}
      aria-label={`${strings.open}: ${when}`}
      className="reveal flex flex-col gap-2 rounded-(--r-tile) bg-mint-deep p-5 text-white outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-98 motion-reduce:transition-none [--i:2]"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="eyebrow text-white/70">{strings.eyebrow}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink">
          <Clock
            aria-hidden
            className="size-3"
          />
          {formatRelativeTime(ride.startsAt, words, now)}
        </span>
      </span>
      <span className="display-title text-3xl">{when}</span>
      {place ? (
        <span className="text-white/85">
          {pilot
            ? say(strings.pilotPicksYou, {
                name: firstName(pilot.name),
                place,
              })
            : say(strings.pickupAt, { place })}
        </span>
      ) : null}
      <span className="mt-2 flex items-center justify-between gap-3">
        {pilot ? (
          <span className="flex min-w-0 items-center gap-2">
            <PersonAvatar svg={avatarSvg(seedOf(pilot))} />
            <span className="truncate font-semibold">{pilot.name}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink">
            <Search
              aria-hidden
              className="size-3"
            />
            {strings.lookingPilot}
          </span>
        )}
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/20"
        >
          <ArrowRight className="size-5" />
        </span>
      </span>
    </Link>
  );
}
