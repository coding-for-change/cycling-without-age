import { Fragment } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, House } from "lucide-react";
import { dayParts } from "@/components/illustrations/countdown";
import { PersonAvatar } from "@/components/person-avatar";
import { FileImage } from "@/features/fleet/components/file-image";
import { subjectSlug, type SubjectRef } from "@/features/person-profiles";
import { calendarDate } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import type { PassengerRideRow, PilotRideRow } from "../facade";
import { EventPhotoTransition } from "./event-photo-transition";
import {
  rideCardPlace,
  rideHeadline,
  ridePilots,
  rideRiderRefs,
  type CalendarStrings,
} from "./ride-presentation";

type AgendaRide = PassengerRideRow & Partial<Pick<PilotRideRow, "roster">>;

type Props = {
  rides: AgendaRide[];
  strings: CalendarStrings;
  locale: Locale;
  words: Locale;
  title?: string;
  href?: (rideId: string) => string;
  profileBase?: string;
  past?: boolean;
  pilotAvatars?: Record<string, string>;
};

export function RideAgenda({
  rides,
  strings,
  locale,
  words,
  title,
  href,
  profileBase,
  past = false,
  pilotAvatars,
}: Props) {
  if (!rides.length) {
    return (
      <section className="flex flex-col gap-3">
        {title ? <h2 className="text-base">{title}</h2> : null}
        <p className="text-2sm text-ink-soft">{strings.agendaEmpty}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {title ? <h2 className="text-base">{title}</h2> : null}
      <ul className="flex flex-col gap-3">
        {rides.map((ride) => (
          <RideCard
            key={ride.id}
            ride={ride}
            strings={strings}
            locale={locale}
            words={words}
            href={href?.(ride.id)}
            profileBase={profileBase}
            past={past}
            pilotAvatars={pilotAvatars}
          />
        ))}
      </ul>
    </section>
  );
}

export function RideCard({
  ride,
  strings,
  locale,
  words,
  href,
  profileBase,
  past,
  pilotAvatars,
}: {
  ride: AgendaRide;
  strings: CalendarStrings;
  locale: Locale;
  words: Locale;
  href?: string;
  profileBase?: string;
  past: boolean;
  pilotAvatars?: Record<string, string>;
}) {
  const zone = ride.chapter.timeZone;
  const cancelled = ride.status === "cancelled";
  const dimmed = past || cancelled;
  const headline = rideHeadline(ride, strings, {
    rideTo: strings.card.rideTo,
    rideFrom: strings.card.rideFrom,
    words,
  });
  const place = rideCardPlace(ride);
  const time = formatTimeRange(ride.startsAt, ride.endsAt, locale, zone);
  const pilots = ridePilots(ride);
  const photo = ride.model === "event" ? ride.photos[0]?.fileId : undefined;
  const riders = ride.roster?.length
    ? rideRiderRefs(ride.roster, strings.pickupCareHome)
    : [];

  return (
    <li
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border border-line bg-canvas p-3.5",
        href &&
          "transition-[background-color,scale] has-[[data-ride-link]:active]:scale-99 has-[[data-ride-link]:focus-visible]:ring-2 has-[[data-ride-link]:focus-visible]:ring-ink has-[[data-ride-link]:hover]:bg-canvas-deep motion-reduce:transition-none",
      )}
    >
      <div className={cn("flex items-center gap-3.5", dimmed && "opacity-60")}>
        {photo ? (
          <EventPhotoTransition rideId={ride.id}>
            <div className="size-14 shrink-0 overflow-hidden rounded-xl">
              <FileImage
                fileId={photo}
                alt=""
                className="size-full"
              />
            </div>
          </EventPhotoTransition>
        ) : (
          <DateBlock
            startsAt={ride.startsAt}
            zone={zone}
            locale={locale}
            muted={dimmed}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {href ? (
            <Link
              href={href}
              prefetch={photo ? true : undefined}
              transitionTypes={["push"]}
              aria-label={[
                headline,
                formatShortDateWithWeekday(
                  calendarDate(ride.startsAt, zone),
                  locale,
                ),
                time,
                place,
                cancelled ? strings.cancelledOn : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              data-ride-link
              className="truncate font-display text-base leading-6 font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl"
            >
              {headline}
            </Link>
          ) : (
            <p className="truncate font-display text-base leading-6 font-semibold">
              {headline}
            </p>
          )}

          <p className="flex min-w-0 items-center gap-1.25 text-2sm text-ink-soft">
            <time
              dateTime={ride.startsAt.toISOString()}
              className={cn(
                "shrink-0 tabular-nums",
                cancelled && "line-through",
              )}
            >
              {time}
            </time>
            {place ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{place}</span>
              </>
            ) : null}
            {cancelled ? (
              <span className="ml-auto shrink-0 rounded-full bg-canvas-deeper px-2 text-xs leading-5 font-medium text-ink">
                {strings.cancelledOn}
              </span>
            ) : null}
          </p>

          <div className="mt-1 flex min-w-0 items-center gap-2 text-2sm">
            {pilots.length ? (
              <>
                <span className="flex shrink-0 -space-x-2">
                  {pilots.slice(0, 3).map((pilot) => (
                    <PilotFace
                      key={pilot.user.id}
                      name={pilot.user.name}
                      svg={pilotAvatars?.[pilot.user.id]}
                    />
                  ))}
                </span>
                <span className="min-w-0 truncate">
                  <People
                    people={pilots.map((pilot) => ({
                      ref: { kind: "user", id: pilot.user.id },
                      name: pilot.user.name,
                    }))}
                    profileBase={profileBase}
                  />
                </span>
              </>
            ) : cancelled || past ? null : (
              <span className="flex items-center gap-2 font-medium text-mint-ink">
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-mint motion-safe:animate-pulse"
                />
                {strings.card.findingPilot}
              </span>
            )}
          </div>
        </div>

        {href ? (
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-ink-faint"
          />
        ) : null}
      </div>

      {riders.length ? (
        <details className="group/roster relative z-10 border-t border-line pt-3">
          <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.25 rounded-md text-2sm text-ink-soft outline-none select-none focus-visible:ring-2 focus-visible:ring-ink [&::-webkit-details-marker]:hidden">
            {formatMessage(strings.riders, { count: riders.length }, words)}
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-open/roster:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <ul className="flex flex-col gap-1.25 pt-2 text-2sm">
            {riders.map((rider) => (
              <li
                key={subjectSlug(rider.ref)}
                className="flex min-w-0 items-center gap-1.25"
              >
                <House
                  aria-hidden
                  className="size-3.5 shrink-0 text-ink-soft"
                />
                <People
                  people={[rider]}
                  profileBase={profileBase}
                />
                {rider.pickup ? (
                  <span
                    className="truncate text-ink-soft"
                    title={formatMessage(
                      strings.pickupLabel,
                      { place: rider.pickup },
                      words,
                    )}
                  >
                    · {rider.pickup}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

export function DateBlock({
  startsAt,
  zone,
  locale,
  muted,
}: {
  startsAt: Date;
  zone: string;
  locale: Locale;
  muted: boolean;
}) {
  const parts = dayParts(startsAt, zone, locale);
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-xl text-ink",
        muted ? "bg-canvas-deep" : "bg-mint-tint",
      )}
    >
      <span className="text-xs leading-4 font-semibold tracking-wide uppercase">
        {parts.weekday}
      </span>
      <span className="font-display text-xl leading-6 font-bold tabular-nums">
        {parts.day}
      </span>
      <span className="text-xs leading-4 text-ink-soft uppercase">
        {parts.month}
      </span>
    </div>
  );
}

function PilotFace({ name, svg }: { name: string; svg?: string }) {
  if (svg)
    return (
      <PersonAvatar
        svg={svg}
        size="sm"
        className="size-6 ring-2 ring-canvas"
      />
    );
  return (
    <span
      aria-hidden
      className="flex size-6 items-center justify-center rounded-full bg-mint-tint text-xs font-semibold text-ink ring-2 ring-canvas"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function People({
  people,
  profileBase,
}: {
  people: { ref: SubjectRef; name: string }[];
  profileBase?: string;
}) {
  if (!profileBase) return people.map((person) => person.name).join(", ");
  return people.map((person, index) => (
    <Fragment key={subjectSlug(person.ref)}>
      {index > 0 ? ", " : null}
      <Link
        href={`${profileBase}/${subjectSlug(person.ref)}`}
        className="relative z-10 rounded-sm underline-offset-2 outline-none hover:text-ink hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {person.name}
      </Link>
    </Fragment>
  ));
}
