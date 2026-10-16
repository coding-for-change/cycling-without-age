/// <reference types="react/canary" />
import { Suspense, ViewTransition, type ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Ban,
  ChevronLeft,
  ExternalLink,
  Flag,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
} from "lucide-react";
import { RichText } from "@/components/markdown";
import { PersonAvatar } from "@/components/person-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { coordsOf, PlaceValue } from "@/features/rides/components/place";
import {
  MODEL_ICON,
  rideTrishaws,
  rideHeadline,
} from "@/features/rides/components/ride-presentation";
import { requirePerspective } from "@/lib/auth-guards";
import { avatarSeed, avatarSvg } from "@/lib/avatar";
import { calendarDate } from "@/lib/calendar";
import {
  formatDateTime,
  formatLongDateWithWeekday,
  formatTimeRange,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { googleMapsUrl } from "@/lib/geo";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn, fullName } from "@/lib/utils";
import { passengerRideView } from "@/use-cases/passenger-rides";
import { RideRouteMap } from "./ride-route-map";
import { RideStory } from "./ride-story";

type View = NonNullable<Awaited<ReturnType<typeof passengerRideView>>>;
type Ride = View["ride"];
type Leg = NonNullable<Ride["returnLeg"]>;

export async function PassengerRide({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  const [{ rideId }, session] = await Promise.all([
    params,
    requirePerspective("passenger"),
  ]);
  const [view, dict, language, head] = await Promise.all([
    passengerRideView(session.user.id, rideId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!view) notFound();

  const { ride, story, riderCount } = view;
  const s = dict.passenger.ride;
  const notation = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const say = (template: string, values: Record<string, string | number>) =>
    formatMessage(template, values, words);
  const zone = ride.chapter.timeZone;
  const now = new Date();
  const Icon = MODEL_ICON[ride.model];
  const cancelled = ride.status === "cancelled";
  const over = !cancelled && ride.endsAt.getTime() <= now.getTime();
  const running =
    !cancelled && !over && ride.startsAt.getTime() <= now.getTime();
  const functional = ride.model === "functional";
  const headline = rideHeadline(ride, dict.calendar);
  const pilots = ride.assignments.filter((a) => a.role === "pilot");
  const trishaws = rideTrishaws(ride).map((trishaw) => trishaw.name);
  const pickup = coordsOf(ride);
  const destination = functional
    ? coordsOf({
        latitude: ride.destinationLatitude,
        longitude: ride.destinationLongitude,
      })
    : null;
  const pickupMaps = googleMapsUrl({
    address: ride.locationAddress,
    latitude: ride.latitude,
    longitude: ride.longitude,
  });
  const destinationMaps = functional
    ? googleMapsUrl({
        address: ride.destinationAddress,
        latitude: ride.destinationLatitude,
        longitude: ride.destinationLongitude,
      })
    : null;
  const hasPlace = !!(
    ride.locationName ||
    ride.locationAddress ||
    ride.destinationName ||
    ride.destinationAddress
  );

  return (
    <>
      <header className="flex flex-col gap-3">
        <Link
          href="/passenger/rides"
          transitionTypes={["pop"]}
          className="-ml-1.25 inline-flex min-h-11 w-fit items-center gap-1 rounded-full pr-3 text-sm text-ink-soft outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronLeft
            aria-hidden
            className="size-4"
          />
          {s.back}
        </Link>
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <Icon
            aria-hidden
            className="size-4"
          />
          {dict.calendar.models[ride.model]}
          {cancelled ? (
            <StatusPill tone="muted">
              {dict.calendar.statuses.cancelled}
            </StatusPill>
          ) : running ? (
            <StatusPill tone="live">{dict.passenger.rides.now}</StatusPill>
          ) : over ? (
            <StatusPill tone="muted">
              {dict.calendar.statuses.completed}
            </StatusPill>
          ) : null}
        </p>
        <ViewTransition name={`passenger-ride-title-${ride.id}`}>
          <h1
            className={cn(
              "text-2xl tracking-tight md:text-3xl",
              cancelled && "text-ink-soft",
            )}
          >
            {headline}
          </h1>
        </ViewTransition>
        <p className="flex flex-col gap-0.5 text-base">
          <span>
            <time
              dateTime={ride.startsAt.toISOString()}
              className={cn(cancelled && "line-through")}
            >
              {formatLongDateWithWeekday(
                calendarDate(ride.startsAt, zone),
                notation,
              )}
              {" · "}
              {formatTimeRange(ride.startsAt, ride.endsAt, notation, zone)}
            </time>
          </span>
          <span className="text-sm text-ink-soft">
            {say(dict.rides.detail.zoneHint, { zone })}
          </span>
        </p>
      </header>

      {cancelled ? (
        <Notice
          icon={Ban}
          title={s.cancelled}
          tone="muted"
        >
          {ride.cancellationReasonCode ? (
            <p>
              {say(s.cancelledBecause, {
                reason: dict.rides.reasons[ride.cancellationReasonCode],
              })}
            </p>
          ) : null}
          {ride.cancellationNote ? (
            <p className="whitespace-pre-wrap">{ride.cancellationNote}</p>
          ) : null}
        </Notice>
      ) : running ? (
        <Notice
          icon={Flag}
          title={s.running}
          tone="live"
        />
      ) : over ? (
        <Notice
          icon={PartyPopper}
          title={s.completed}
          tone="mint"
        />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          <Section title={s.where}>
            {hasPlace ? (
              <div className="flex flex-col gap-3">
                <PlaceRow
                  label={s.pickup}
                  name={ride.locationName}
                  address={ride.locationAddress}
                  maps={pickupMaps}
                  open={s.openInMaps}
                />
                {functional ? (
                  <PlaceRow
                    label={s.destination}
                    name={ride.destinationName}
                    address={ride.destinationAddress}
                    maps={destinationMaps}
                    open={s.openInMaps}
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">{s.noPlace}</p>
            )}
            {pickup ? (
              <Suspense fallback={<Skeleton className="h-48 rounded-2xl" />}>
                <RideRouteMap
                  pickup={pickup}
                  destination={destination}
                  label={dict.rides.schedule.mapLabel}
                  unavailable={dict.rides.schedule.mapUnavailable}
                  eta={dict.rides.detail.eta}
                  language={language}
                  notation={notation}
                />
              </Suspense>
            ) : null}
          </Section>

          {ride.description?.trim() ? (
            <Section title={s.about}>
              <RichText
                text={ride.description}
                className="text-base"
              />
            </Section>
          ) : null}

          <Section title={s.storyTitle}>
            <RideStory
              entries={story}
              chapter={ride.chapter.name}
              timeZone={zone}
              strings={s.story}
              reasons={dict.rides.reasons}
              models={dict.calendar.models}
              empty={s.storyEmpty}
              notation={notation}
              words={words}
              now={now}
            />
          </Section>
        </div>

        <aside className="flex flex-col gap-4">
          <Panel title={say(s.pilots, { count: Math.max(1, pilots.length) })}>
            {pilots.length ? (
              <ul className="flex flex-col gap-4">
                {pilots.map(({ user }) => (
                  <li key={user.id}>
                    <PilotCard
                      name={user.name}
                      email={user.email}
                      phone={user.phoneNumber}
                      call={say(s.call, { name: user.name })}
                      write={say(s.email, { name: user.name })}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">
                {cancelled ? dict.rides.detail.emptyPilots : s.noPilot}
              </p>
            )}
          </Panel>

          <Panel title={s.booked}>
            <ul className="flex flex-col gap-1 text-sm">
              {ride.roster.map(({ passenger }) => (
                <li key={passenger.id}>{fullName(passenger)}</li>
              ))}
            </ul>
            {ride.capacity !== null && riderCount > 0 ? (
              <p className="text-sm text-ink-soft">
                {say(dict.rides.detail.placesTaken, {
                  count: ride._count.roster,
                  max: ride.capacity,
                })}
              </p>
            ) : null}
          </Panel>

          {ride.returnLegOf || ride.returnLeg ? (
            <Panel
              title={
                dict.rides.detail.wayThere + " · " + dict.rides.detail.wayBack
              }
            >
              <div className="flex flex-col gap-3">
                {ride.returnLegOf ? (
                  <LegRow
                    label={dict.rides.detail.wayThere}
                    leg={ride.returnLegOf}
                    zone={zone}
                    notation={notation}
                    open={s.openLeg}
                    cancelled={dict.calendar.statuses.cancelled}
                  />
                ) : null}
                {ride.returnLeg ? (
                  <LegRow
                    label={dict.rides.detail.wayBack}
                    leg={ride.returnLeg}
                    zone={zone}
                    notation={notation}
                    open={s.openLeg}
                    cancelled={dict.calendar.statuses.cancelled}
                  />
                ) : null}
              </div>
            </Panel>
          ) : null}

          {trishaws.length ? (
            <Panel title={say(s.trishaws, { count: trishaws.length })}>
              <p className="text-sm">{trishaws.join(", ")}</p>
            </Panel>
          ) : null}

          <Panel title={s.chapter}>
            <p className="text-sm">{ride.chapter.name}</p>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "muted" | "live";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 text-xs font-medium",
        tone === "live"
          ? "bg-mint-deep text-white"
          : "bg-canvas-deeper text-ink",
      )}
    >
      {children}
    </span>
  );
}

function Notice({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: typeof Ban;
  title: string;
  tone: "muted" | "mint" | "live";
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-2xl border p-4",
        tone === "muted" && "border-line bg-canvas-deep",
        tone === "mint" && "border-mint bg-mint-tint",
        tone === "live" && "border-mint-deep bg-mint-deep text-white",
      )}
    >
      <Icon
        aria-hidden
        className="mt-0.5 size-5 shrink-0"
      />
      <div className="flex min-w-0 flex-col gap-1.25 text-sm">
        <p className="text-base font-medium">{title}</p>
        {children}
      </div>
    </div>
  );
}

function PlaceRow({
  label,
  name,
  address,
  maps,
  open,
}: {
  label: string;
  name: string | null;
  address: string | null;
  maps: string | null;
  open: string;
}) {
  if (!name && !address) return null;
  return (
    <div className="flex items-start gap-3">
      <MapPin
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-ink-soft"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-ink-soft">{label}</span>
        <PlaceValue
          name={name}
          address={address}
        />
      </div>
      {maps ? (
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.25 rounded-full px-3 text-sm text-ink-soft outline-none hover:bg-canvas-deep hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {open}
          <ExternalLink
            aria-hidden
            className="size-3.5"
          />
        </a>
      ) : null}
    </div>
  );
}

function PilotCard({
  name,
  email,
  phone,
  call,
  write,
}: {
  name: string;
  email: string;
  phone: string | null;
  call: string;
  write: string;
}) {
  const action =
    "flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm outline-none hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ring/50";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <PersonAvatar
          svg={avatarSvg(avatarSeed(email), true)}
          size="lg"
        />
        <span className="font-medium">{name}</span>
      </div>
      <div className="flex flex-col gap-1.25">
        {phone ? (
          <a
            href={`tel:${phone}`}
            aria-label={call}
            className={action}
          >
            <Phone
              aria-hidden
              className="size-4 shrink-0 text-ink-soft"
            />
            <span className="truncate tabular-nums">{phone}</span>
          </a>
        ) : null}
        <a
          href={`mailto:${email}`}
          aria-label={write}
          className={action}
        >
          <Mail
            aria-hidden
            className="size-4 shrink-0 text-ink-soft"
          />
          <span className="truncate">{email}</span>
        </a>
      </div>
    </div>
  );
}

function LegRow({
  label,
  leg,
  zone,
  notation,
  open,
  cancelled,
}: {
  label: string;
  leg: Leg;
  zone: string;
  notation: Locale;
  open: string;
  cancelled: string;
}) {
  const when = formatDateTime(leg.startsAt, notation, zone);
  const body = (
    <span className="flex min-w-0 flex-col">
      <span className="text-xs text-ink-soft">{label}</span>
      <span
        className={cn(
          "text-sm tabular-nums",
          leg.status === "cancelled" && "text-ink-soft line-through",
        )}
      >
        {when}
      </span>
      {leg.status === "cancelled" ? (
        <span className="text-xs text-ink-soft">{cancelled}</span>
      ) : null}
    </span>
  );
  if (!leg.roster.length) return body;
  return (
    <Link
      href={`/passenger/rides/${leg.id}`}
      transitionTypes={["push"]}
      aria-label={`${label}: ${when} — ${open}`}
      className="-mx-2 flex items-center justify-between gap-2 rounded-xl px-2 py-1 outline-none hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {body}
      <span className="text-sm text-ink-soft">{open}</span>
    </Link>
  );
}
