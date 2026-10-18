/// <reference types="react/canary" />
import { Suspense, ViewTransition, type ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Ban,
  Check,
  ChevronLeft,
  Clock,
  ExternalLink,
  Flag,
  Mail,
  MapPin,
  Phone,
  Search,
} from "lucide-react";
import { Scene, type SceneName } from "@/components/art";
import { RichText } from "@/components/markdown";
import { PersonAvatar } from "@/components/person-avatar";
import { ReadAloud } from "@/components/read-aloud";
import { Skeleton } from "@/components/ui/skeleton";
import { coordsOf, PlaceValue } from "@/features/rides/components/place";
import {
  MODEL_ICON,
  rideTrishaws,
  rideHeadline,
} from "@/features/rides/components/ride-presentation";
import { requirePerspective } from "@/lib/auth-guards";
import { avatarSvg, seedOf } from "@/lib/avatar";
import { calendarDate, dayKey } from "@/lib/calendar";
import {
  formatDateTime,
  formatDurationLong,
  formatList,
  formatLongDateWithWeekday,
  formatRelativeTime,
  formatTime,
  formatTimeRange,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { googleMapsUrl } from "@/lib/geo";
import { isPhoneTempEmail } from "@/lib/identity";
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

  const { ride, story, riderCount, contactOpen } = view;
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
  const date = formatLongDateWithWeekday(
    calendarDate(ride.startsAt, zone),
    notation,
  );
  const pilotNames = formatList(
    pilots.map(({ user }) => user.name),
    words,
  );
  const duration = formatDurationLong(
    (ride.endsAt.getTime() - ride.startsAt.getTime()) / 1000,
    words,
  );
  const spoken = [
    cancelled
      ? say(s.speak.cancelled, { title: headline, date })
      : over
        ? say(s.speak.past, { title: headline, date, duration })
        : say(s.speak.upcoming, {
            title: headline,
            date,
            time: formatTime(ride.startsAt, notation, zone),
          }),
    cancelled && ride.cancellationReasonCode
      ? say(s.cancelledBecause, {
          reason: dict.rides.reasons[ride.cancellationReasonCode],
        })
      : null,
    !cancelled && !over && (ride.locationName || ride.locationAddress)
      ? say(s.speak.pickup, {
          place: (ride.locationName || ride.locationAddress) ?? "",
        })
      : null,
    !cancelled &&
    !over &&
    functional &&
    (ride.destinationName || ride.destinationAddress)
      ? say(s.speak.destination, {
          place: (ride.destinationName || ride.destinationAddress) ?? "",
        })
      : null,
    cancelled
      ? null
      : pilots.length
        ? over
          ? say(s.speak.pastPilot, { names: pilotNames })
          : say(s.speak.pilot, { count: pilots.length, names: pilotNames })
        : over
          ? null
          : s.speak.noPilot,
  ]
    .filter(Boolean)
    .join(" ");
  const voice = notation.startsWith(language) ? notation : language;

  const relative =
    !cancelled && !over ? formatRelativeTime(ride.startsAt, words, now) : null;
  const sameDay = dayKey(ride.startsAt, zone) === dayKey(now, zone);
  const steps: Step[] = [
    { label: s.timeline.booked, state: "done" },
    { label: s.timeline.pilotFound, state: pilots.length ? "done" : "next" },
    {
      label: s.timeline.rideDay,
      sub: `${date} · ${formatTime(ride.startsAt, notation, zone)}`,
      state: over ? "done" : sameDay || running ? "now" : "next",
    },
    { label: s.timeline.done, state: over ? "done" : "next" },
  ];
  const details: { label: string; value: ReactNode }[] = [
    ...(ride.roster.length
      ? [
          {
            label: s.booked,
            value: formatList(
              ride.roster.map(({ passenger }) => fullName(passenger)),
              words,
            ),
          },
        ]
      : []),
    ...(ride.capacity !== null && riderCount > 0
      ? [
          {
            label: s.places,
            value: say(dict.rides.detail.placesTaken, {
              count: ride._count.roster,
              max: ride.capacity,
            }),
          },
        ]
      : []),
    { label: s.duration, value: duration },
    ...(trishaws.length
      ? [
          {
            label: say(s.trishaws, { count: trishaws.length }),
            value: formatList(trishaws, words),
          },
        ]
      : []),
    { label: s.chapter, value: ride.chapter.name },
  ];

  return (
    <>
      <Link
        href="/passenger/rides"
        transitionTypes={["pop"]}
        className="-ml-1.25 inline-flex min-h-11 w-fit items-center gap-1 rounded-full pr-3 text-sm text-ink-soft outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/50 max-md:hidden"
      >
        <ChevronLeft
          aria-hidden
          className="size-4"
        />
        {s.back}
      </Link>

      <div className="reveal overflow-hidden rounded-(--r-cover) [--i:0]">
        <Scene
          name={COVER[ride.model]}
          className={cn(
            "aspect-5/2 w-full",
            cancelled && "opacity-50 grayscale",
          )}
        />
      </div>

      <header className="reveal flex flex-col gap-3 [--i:1]">
        <h1
          className={cn(
            "display-title text-3xl md:text-4xl",
            cancelled && "text-ink-soft line-through",
          )}
        >
          <time dateTime={ride.startsAt.toISOString()}>
            {date} · {formatTime(ride.startsAt, notation, zone)}
          </time>
        </h1>
        <p className="flex flex-wrap items-center gap-1.25">
          <Badge tone="outline">
            <Icon
              aria-hidden
              className="size-3"
            />
            {dict.calendar.models[ride.model]}
          </Badge>
          {cancelled ? (
            <Badge tone="grey">{dict.calendar.statuses.cancelled}</Badge>
          ) : running ? (
            <Badge tone="live">{dict.passenger.rides.now}</Badge>
          ) : over ? (
            <Badge tone="grey">{dict.calendar.statuses.completed}</Badge>
          ) : (
            <Badge tone="mint">{dict.calendar.statuses.scheduled}</Badge>
          )}
          {relative ? (
            <Badge tone="outline">
              <Clock
                aria-hidden
                className="size-3"
              />
              {relative}
            </Badge>
          ) : null}
        </p>
        <ViewTransition name={`passenger-ride-title-${ride.id}`}>
          <p className={cn("text-lg font-bold", cancelled && "text-ink-soft")}>
            {headline}
          </p>
        </ViewTransition>
        <p className="text-sm text-ink-soft">
          {formatTimeRange(ride.startsAt, ride.endsAt, notation, zone)}
          {" · "}
          {say(dict.rides.detail.zoneHint, { zone })}
        </p>
        <ReadAloud
          text={spoken}
          lang={voice}
          labels={s.speak}
          className="w-fit"
        />
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
      ) : (
        <>
          {running ? (
            <Notice
              icon={Flag}
              title={s.running}
              tone="live"
            />
          ) : null}
          {over ? (
            <MemoryCard
              date={date}
              title={s.memory.title}
              outside={say(s.memory.outside, { duration })}
              places={[
                ride.locationName || ride.locationAddress,
                functional
                  ? ride.destinationName || ride.destinationAddress
                  : null,
              ].filter((place): place is string => Boolean(place))}
              via={dict.calendar.via}
              pilots={pilots.map(({ user }) => ({
                id: user.id,
                avatar: avatarSvg(seedOf(user)),
              }))}
              withPilots={
                pilots.length
                  ? say(s.memory.withPilots, { names: pilotNames })
                  : null
              }
              slogan={s.memory.slogan}
            />
          ) : null}
          <Timeline
            steps={steps}
            className="reveal [--i:2]"
          />
        </>
      )}

      <section
        aria-label={say(s.pilots, { count: Math.max(1, pilots.length) })}
        className="reveal flex flex-col gap-3 [--i:3]"
      >
        {pilots.length ? (
          pilots.map(({ user }) => (
            <PilotCard
              key={user.id}
              title={say(s.pilots, { count: 1 })}
              name={user.name}
              avatar={avatarSvg(seedOf(user), true)}
              email={
                contactOpen && !isPhoneTempEmail(user.email) ? user.email : null
              }
              phone={contactOpen ? user.phoneNumber : null}
              call={s.call}
              write={s.email}
              note={
                contactOpen
                  ? s.callNote
                  : !cancelled && !over
                    ? s.contactLater
                    : null
              }
              say={say}
            />
          ))
        ) : (
          <div className="flex items-center gap-3 rounded-(--r-tile) bg-mint-tint p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-paper">
              <Search
                aria-hidden
                className="size-5"
              />
            </span>
            <p className="text-base">
              {cancelled ? dict.rides.detail.emptyPilots : s.noPilot}
            </p>
          </div>
        )}
      </section>

      <Card title={s.details}>
        <dl className="divide-y divide-line">
          {details.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <dt className="shrink-0 text-ink-soft">{row.label}</dt>
              <dd className="min-w-0 text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
        {ride.returnLegOf || ride.returnLeg ? (
          <div className="flex flex-col gap-3 border-t border-line pt-3">
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
        ) : null}
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">{s.where}</h2>
        <div className="overflow-hidden rounded-soft border border-line bg-paper shadow-soft">
          {pickup ? (
            <Suspense fallback={<Skeleton className="h-48 rounded-none" />}>
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
          <div className="flex flex-col gap-3 p-4">
            {hasPlace ? (
              <>
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
              </>
            ) : (
              <p className="text-sm text-ink-soft">{s.noPlace}</p>
            )}
          </div>
        </div>
      </section>

      {ride.description?.trim() ? (
        <Card title={s.about}>
          <RichText
            text={ride.description}
            className="text-base"
          />
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">{s.storyTitle}</h2>
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
      </section>
    </>
  );
}

/**
 * What is left of a ride once it is over: a postcard — the day, the time out
 * in the open, where it went and who pedalled — on the brand's diagonal mint.
 */
function MemoryCard({
  date,
  title,
  outside,
  places,
  via,
  pilots,
  withPilots,
  slogan,
}: {
  date: string;
  title: string;
  outside: string;
  places: string[];
  via: string;
  pilots: { id: string; avatar: string }[];
  withPilots: string | null;
  slogan: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-(--r-tile) bg-mint-tint p-5 md:p-6">
      <div
        aria-hidden
        className="diagonal-edge absolute inset-x-0 top-0 h-28 bg-mint"
      />
      <div className="relative flex flex-col gap-4">
        <p className="text-sm font-medium">{date}</p>
        <h2 className="text-2xl md:text-3xl">{title}</h2>
        <p className="text-lg">{outside}</p>
        {places.length ? (
          <p className="text-base">{places.join(` ${via} `)}</p>
        ) : null}
        {withPilots ? (
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {pilots.map((pilot) => (
                <PersonAvatar
                  key={pilot.id}
                  svg={pilot.avatar}
                  className="size-11 ring-2 ring-mint-tint"
                />
              ))}
            </div>
            <p className="text-base">{withPilots}</p>
          </div>
        ) : null}
        <p className="font-display text-sm text-ink-soft">{slogan}</p>
      </div>
    </section>
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

const COVER: Record<Ride["model"], SceneName> = {
  pleasure: "park",
  event: "festival",
  functional: "market",
};

type Step = { label: string; sub?: string; state: "done" | "now" | "next" };

/** Where a ride stands, in mockup 2's four steps. */
function Timeline({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol
      className={cn(
        "flex flex-col gap-4 rounded-soft border border-line bg-paper p-5 shadow-soft",
        className,
      )}
    >
      {steps.map((step) => (
        <li
          key={step.label}
          aria-current={step.state === "now" ? "step" : undefined}
          className="flex items-start gap-3"
        >
          <span
            aria-hidden
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
              step.state === "done" && "border-mint bg-mint text-ink",
              step.state === "now" && "border-ink",
              step.state === "next" && "border-line",
            )}
          >
            {step.state === "done" ? (
              <Check className="size-3.5" />
            ) : step.state === "now" ? (
              <span className="size-2.5 rounded-full bg-ink" />
            ) : null}
          </span>
          <span className="flex flex-col">
            <span
              className={cn(
                "text-base",
                step.state === "next" ? "text-ink-soft" : "font-bold",
              )}
            >
              {step.label}
            </span>
            {step.sub && step.state === "now" ? (
              <span className="text-sm text-ink-soft">{step.sub}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-soft border border-line bg-paper p-5 shadow-soft">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  );
}

const badgeTone = {
  outline: "border-line text-ink-soft",
  grey: "border-transparent bg-grey-tint text-ink",
  mint: "border-transparent bg-mint-tint text-ink",
  live: "border-transparent bg-mint-deep text-white",
} as const;

function Badge({
  tone,
  children,
}: {
  tone: keyof typeof badgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold",
        badgeTone[tone],
      )}
    >
      {children}
    </span>
  );
}

/** The pilot as mockup 2 introduces them: a mint card, a big round phone button. */
function PilotCard({
  title,
  name,
  avatar,
  email,
  phone,
  call,
  write,
  note,
  say,
}: {
  title: string;
  name: string;
  avatar: string;
  email: string | null;
  phone: string | null;
  call: string;
  write: string;
  note: string | null;
  say: (template: string, values: Record<string, string | number>) => string;
}) {
  const action =
    "flex min-h-13 items-center justify-center gap-2 rounded-full border border-line bg-paper px-5 font-bold shadow-soft outline-none hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50";
  return (
    <div className="flex flex-col gap-4 rounded-(--r-tile) bg-mint-tint p-5">
      <div className="flex items-center gap-3">
        <PersonAvatar
          svg={avatar}
          className="size-16"
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm text-ink-soft">{title}</span>
          <span className="display-title truncate text-xl">{name}</span>
        </div>
      </div>
      {phone ? (
        <a
          href={`tel:${phone}`}
          className={action}
        >
          <Phone
            aria-hidden
            className="size-4 shrink-0"
          />
          <span className="sr-only">{say(call, { name })}: </span>
          <span className="truncate tabular-nums">{phone}</span>
        </a>
      ) : null}
      {email ? (
        <a
          href={`mailto:${email}`}
          className={cn(action, "font-normal")}
        >
          <Mail
            aria-hidden
            className="size-4 shrink-0"
          />
          <span className="sr-only">{say(write, { name })}: </span>
          <span className="truncate">{email}</span>
        </a>
      ) : null}
      {note ? (
        <p className="text-center text-sm text-ink-soft">{note}</p>
      ) : null}
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
