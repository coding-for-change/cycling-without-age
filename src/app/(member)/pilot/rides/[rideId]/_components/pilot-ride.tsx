import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Bike,
  CalendarClock,
  Flag,
  StickyNote,
} from "lucide-react";
import { RichText } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { rides, type PilotRideDetailRow } from "@/features/rides";
import { requirePerspective } from "@/lib/auth-guards";
import { calendarDate, sameDay } from "@/lib/calendar";
import {
  formatRelativeTime,
  formatShortDateWithWeekday,
  formatTimeRange,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { cn, fullName } from "@/lib/utils";
import { RideWhere } from "./ride-where";

type Leg = NonNullable<PilotRideDetailRow["returnLeg"]>;

export async function PilotRide({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  const [{ rideId }, session] = await Promise.all([
    params,
    requirePerspective("pilot"),
  ]);
  const userId = session.user.id;
  const [ride, dict, language, head] = await Promise.all([
    rides.getRideForPilot(rideId, userId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  if (!ride) notFound();

  const otherLeg = ride.returnLeg ?? ride.returnLegOf;
  const otherLegOpen = otherLeg
    ? await rides.pilotCanOpen(otherLeg.id, userId)
    : false;

  const now = new Date();
  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const strings = dict.pilot.rides.detail;
  const zone = ride.chapter.timeZone;
  const cancelled = ride.status === "cancelled";
  const canFinish = rides.isFinishable(ride, now);
  const crew = ride.assignments.filter(
    (assignment) => assignment.user.id !== userId,
  );
  const headline = ride.title?.trim() || dict.calendar.models[ride.model];

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
        {strings.back}
      </Link>

      <header className="flex flex-col gap-1.25">
        <StatusBadge
          status={ride.status}
          strings={dict.calendar.statuses}
        />
        <h1
          className={cn(
            "text-2xl tracking-tight md:text-3xl",
            cancelled && "text-ink-soft line-through",
          )}
        >
          {headline}
        </h1>
        <p className="flex flex-wrap items-center gap-x-1.25 text-ink-soft">
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
          {!cancelled && ride.endsAt > now ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatRelativeTime(ride.startsAt, words, now)}</span>
            </>
          ) : null}
        </p>
        <p className="text-2sm text-ink-soft">
          {ride.title?.trim()
            ? [dict.calendar.models[ride.model], ride.chapter.name].join(" · ")
            : ride.chapter.name}
        </p>
      </header>

      {cancelled ? (
        <section className="bg-canvas-deep flex items-start gap-3 rounded-2xl p-4">
          <Ban
            aria-hidden
            className="text-ink mt-0.5 size-5 shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-medium">{strings.cancelled}</p>
            <p className="text-2sm text-ink-soft">
              {ride.cancellationReasonCode
                ? dict.rides.reasons[ride.cancellationReasonCode]
                : strings.cancelledBody}
            </p>
          </div>
        </section>
      ) : null}

      {canFinish ? (
        <Link
          href={`/pilot/rides/${ride.id}/finish`}
          transitionTypes={["push"]}
          className="border-mint bg-mint-tint hover:bg-mint flex items-center gap-4 rounded-2xl border p-4 transition-colors motion-reduce:transition-none"
        >
          <Flag
            aria-hidden
            className="text-ink size-5 shrink-0"
          />
          <span className="min-w-0">
            <span className="block font-medium">{dict.fleet.finish.title}</span>
            <span className="text-ink-soft block text-sm">
              {dict.fleet.finish.homeCard.body}
            </span>
          </span>
          <ArrowRight
            aria-hidden
            className="text-ink-soft ml-auto size-4 shrink-0"
          />
        </Link>
      ) : null}

      {ride.note?.trim() ? (
        <section
          aria-label={strings.note}
          className="bg-mint-tint flex items-start gap-3 rounded-2xl p-4"
        >
          <StickyNote
            aria-hidden
            className="text-ink mt-0.5 size-5 shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-2sm font-medium">{strings.note}</p>
            <RichText
              text={ride.note}
              className="text-sm"
            />
          </div>
        </section>
      ) : null}

      <RideWhere
        ride={ride}
        strings={strings}
        openInMaps={dict.fleet.finish.openInMaps}
      />

      <Section title={strings.riders}>
        {ride.roster.length > 0 ? (
          <ol className="border-line divide-line divide-y rounded-2xl border">
            {ride.roster.map(({ id, passenger }, index) => (
              <li
                key={id}
                className="flex min-h-12 items-center gap-3 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="bg-mint-tint text-ink flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 truncate">{fullName(passenger)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <Muted>{strings.noRiders}</Muted>
        )}
      </Section>

      <Section title={strings.trishaws}>
        {ride.trishaws.length > 0 ? (
          <ul className="border-line divide-line divide-y rounded-2xl border">
            {ride.trishaws.map(({ trishaw }) => (
              <li
                key={trishaw.id}
                className="flex min-h-12 items-center gap-3 px-4 py-3"
              >
                <Bike
                  aria-hidden
                  className="text-ink-soft size-4 shrink-0"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{trishaw.name}</span>
                  {trishaw.type ? (
                    <span className="text-2sm text-ink-soft truncate">
                      {trishaw.type.name}
                    </span>
                  ) : null}
                </span>
                {trishaw.status !== "active" ? (
                  <Badge
                    variant="outline"
                    className="border-line text-ink-soft ml-auto"
                  >
                    {dict.calendar.trishawStatuses[trishaw.status]}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Muted>{strings.noTrishaws}</Muted>
        )}
      </Section>

      <Section title={strings.crew}>
        {crew.length > 0 ? (
          <ul className="border-line divide-line divide-y rounded-2xl border">
            {crew.map(({ user }) => (
              <li
                key={user.id}
                className="flex min-h-12 items-center gap-3 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="bg-canvas-deep text-ink flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                >
                  {initial(user.name)}
                </span>
                <span className="min-w-0 truncate">{user.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Muted>{strings.solo}</Muted>
        )}
      </Section>

      {otherLeg ? (
        <Section title={strings.roundTrip}>
          <OtherLeg
            leg={otherLeg}
            label={
              ride.returnLeg
                ? dict.rides.detail.wayBack
                : dict.rides.detail.wayThere
            }
            open={otherLegOpen}
            sameDayAs={ride.startsAt}
            timeZone={zone}
            locale={locale}
            cancelledLabel={dict.calendar.statuses.cancelled}
          />
        </Section>
      ) : null}

      {ride.description?.trim() ? (
        <Section title={strings.about}>
          <RichText
            text={ride.description}
            className="text-sm"
          />
        </Section>
      ) : null}
    </>
  );
}

const initial = (name: string) =>
  name.trim().charAt(0).toLocaleUpperCase() || "·";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ink-soft text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <p className="text-2sm text-ink-soft border-line rounded-2xl border p-4">
      {children}
    </p>
  );
}

function StatusBadge({
  status,
  strings,
}: {
  status: PilotRideDetailRow["status"];
  strings: Dictionary["calendar"]["statuses"];
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-line",
        status === "scheduled" && "border-mint bg-mint-tint text-ink",
        status === "completed" && "bg-canvas-deep text-ink",
        status === "cancelled" && "text-ink-soft",
      )}
    >
      {strings[status]}
    </Badge>
  );
}

function OtherLeg({
  leg,
  label,
  open,
  sameDayAs,
  timeZone,
  locale,
  cancelledLabel,
}: {
  leg: Leg;
  label: string;
  open: boolean;
  sameDayAs: Date;
  timeZone: string;
  locale: Locale;
  cancelledLabel: string;
}) {
  const cancelled = leg.status === "cancelled";
  const body = (
    <>
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-2sm text-ink-soft">
          {sameDay(leg.startsAt, sameDayAs, timeZone)
            ? null
            : `${formatShortDateWithWeekday(calendarDate(leg.startsAt, timeZone), locale)} · `}
          <time
            dateTime={leg.startsAt.toISOString()}
            className={cn(cancelled && "line-through")}
          >
            {formatTimeRange(leg.startsAt, leg.endsAt, locale, timeZone)}
          </time>
          {cancelled ? ` · ${cancelledLabel}` : null}
        </span>
      </span>
      {open ? (
        <ArrowRight
          aria-hidden
          className="text-ink-soft ml-auto size-4 shrink-0"
        />
      ) : null}
    </>
  );

  const box =
    "border-line flex min-h-12 items-center gap-3 rounded-2xl border p-4";

  return open ? (
    <Link
      href={`/pilot/rides/${leg.id}`}
      transitionTypes={["push"]}
      className={cn(
        box,
        "hover:bg-canvas-deep transition-colors motion-reduce:transition-none",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
