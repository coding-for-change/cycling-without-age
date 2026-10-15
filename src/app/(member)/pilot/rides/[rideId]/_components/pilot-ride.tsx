import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Bike,
  CalendarClock,
  Flag,
  MessageCircle,
  Phone,
  StickyNote,
} from "lucide-react";
import { RichText } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { chapters } from "@/features/chapters";
import { chat } from "@/features/chat";
import { pickupLabel, pickupOf } from "@/features/passengers";
import { rides, type PilotRideDetailRow } from "@/features/rides";
import { CheckInList } from "@/features/rides/components/check-in-list";
import {
  checkInStrings,
  walkUpStrings,
} from "@/features/rides/components/strings";
import { WalkUpDrawer } from "@/features/rides/components/walk-up-drawer";
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
import { formatMessage } from "@/lib/i18n/format";
import { cn, fullName } from "@/lib/utils";
import { pickupView } from "@/use-cases/finish-ride";
import { pilotChapterIds } from "../../_components/open-rides";
import { OpenRide } from "./open-ride";
import { PickupCard } from "./pickup-card";
import { RideWhere } from "./ride-where";
import { WithdrawButton } from "./withdraw-button";

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
  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  if (!ride)
    return (
      <OpenRide
        rideId={rideId}
        pilotChapterIds={pilotChapterIds(session.access)}
        dict={dict}
        locale={locale}
        words={words}
      />
    );

  const now = new Date();
  const otherLeg = ride.returnLeg ?? ride.returnLegOf;
  const [otherLegOpen, settings, chatId, pickup] = await Promise.all([
    otherLeg ? rides.pilotCanOpen(otherLeg.id, userId) : false,
    chapters.getSettings(ride.chapterId),
    chat.getRideConversationId(ride.id, userId),
    pickupView(ride, now),
  ]);
  const ahead = ride.status === "scheduled" && ride.startsAt > now;
  const mayWithdraw =
    ahead &&
    now <
      rides.withdrawalClosesAt(ride.startsAt, settings.staffingCheckLeadHours);
  const strings = dict.pilot.rides.detail;
  const zone = ride.chapter.timeZone;
  const cancelled = ride.status === "cancelled";
  const canFinish = rides.isFinishable(ride, now);
  const doorOpen = rides.checkInOpen(ride, "pilot", now);
  const completed = ride.status === "completed";
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

      {chatId ? (
        <Link
          href={`/pilot/chat/${chatId}`}
          transitionTypes={["push"]}
          className="border-line hover:bg-canvas-deep flex items-center gap-4 rounded-2xl border p-4 transition-colors motion-reduce:transition-none"
        >
          <MessageCircle
            aria-hidden
            className="text-ink size-5 shrink-0"
          />
          <span className="min-w-0">
            <span className="block font-medium">{strings.chat}</span>
            <span className="text-ink-soft block text-sm">
              {strings.chatHint}
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

      {pickup ? (
        <PickupCard
          places={pickup}
          dict={dict}
          words={words}
        />
      ) : null}

      {doorOpen || completed ? (
        <Section
          title={doorOpen ? dict.rides.execution.checkIn : strings.riders}
        >
          {doorOpen ? (
            <p className="text-2sm text-ink-soft">
              {dict.rides.execution.checkInHint}
            </p>
          ) : null}
          <CheckInList
            rideId={ride.id}
            entries={ride.roster.map((entry) => ({
              id: entry.id,
              name: entry.passenger
                ? fullName(entry.passenger)
                : (entry.guestName ?? ""),
              walkUp: !entry.passenger,
              attendance: entry.attendance,
              pickup: entry.passenger
                ? pickupLine(entry.passenger, dict, words)
                : null,
              phone: entry.passenger
                ? (entry.passenger.user?.phoneNumber ??
                  entry.passenger.managedBy.phoneNumber)
                : null,
              via:
                entry.passenger && !entry.passenger.user?.phoneNumber
                  ? entry.passenger.managedBy.name
                  : null,
            }))}
            open={doorOpen}
            language={language}
            labels={checkInStrings(dict, {
              call: strings.call,
              via: strings.via,
            })}
          />
          {doorOpen ? (
            <WalkUpDrawer
              rideId={ride.id}
              language={language}
              labels={walkUpStrings(dict)}
              triggerClassName="w-full sm:w-fit"
            />
          ) : null}
        </Section>
      ) : (
        <Section title={strings.riders}>
          {ride.roster.length > 0 ? (
            <ol className="border-line divide-line divide-y rounded-2xl border">
              {ride.roster.map(({ id, passenger, guestName }, index) => (
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
                  {passenger ? (
                    <RiderContact
                      name={fullName(passenger)}
                      pickup={pickupLine(passenger, dict, words)}
                      phone={
                        passenger.user?.phoneNumber ??
                        passenger.managedBy.phoneNumber
                      }
                      via={
                        passenger.user?.phoneNumber
                          ? null
                          : passenger.managedBy.name
                      }
                      strings={strings}
                      words={words}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{guestName}</span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <Muted>{strings.noRiders}</Muted>
          )}
        </Section>
      )}

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

      {otherLeg && otherLegOpen ? (
        <Section title={strings.roundTrip}>
          <OtherLeg
            leg={otherLeg}
            label={
              ride.returnLeg
                ? dict.rides.detail.wayBack
                : dict.rides.detail.wayThere
            }
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

      {mayWithdraw ? (
        <div className="mt-auto flex flex-col pt-4">
          <WithdrawButton
            rideId={ride.id}
            labels={{
              ...strings.withdraw,
              body:
                otherLegOpen && otherLeg?.status === "scheduled"
                  ? strings.withdraw.bodyBoth
                  : strings.withdraw.body,
            }}
            errors={{ ...dict.common.errors, ...dict.pilot.rides.errors }}
          />
        </div>
      ) : ahead ? (
        <p className="text-2sm text-ink-soft border-line rounded-2xl border p-4">
          {formatMessage(
            strings.withdrawClosed,
            {
              hours: settings.staffingCheckLeadHours,
              chapter: ride.chapter.name,
            },
            words,
          )}
        </p>
      ) : null}
    </>
  );
}

/**
 * The rider, where they are picked up, and the number that reaches them or
 * whoever books for them.
 */
function RiderContact({
  name,
  pickup,
  phone,
  via,
  strings,
  words,
}: {
  name: string;
  pickup: string | null;
  phone: string | null;
  via: string | null;
  strings: Dictionary["pilot"]["rides"]["detail"];
  words: Locale;
}) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{name}</span>
        {pickup ? (
          <span className="text-2sm text-ink-soft truncate">{pickup}</span>
        ) : null}
        {phone && via ? (
          <span className="text-2sm text-ink-soft truncate">
            {formatMessage(strings.via, { name: via }, words)}
          </span>
        ) : null}
      </span>
      {phone ? (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          aria-label={formatMessage(strings.call, { name }, words)}
          className="text-2sm border-line hover:bg-canvas-deep inline-flex min-h-11 shrink-0 items-center gap-1.25 rounded-full border px-3 tabular-nums transition-colors motion-reduce:transition-none"
        >
          <Phone
            aria-hidden
            className="size-4"
          />
          {phone}
        </a>
      ) : null}
    </>
  );
}

function pickupLine(
  passenger: Parameters<typeof pickupOf>[0],
  dict: Dictionary,
  words: Locale,
) {
  const place = pickupLabel(pickupOf(passenger), dict.calendar.pickupCareHome);
  return place
    ? formatMessage(dict.calendar.pickupLabel, { place }, words)
    : null;
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

/** Only a leg the pilot is on too: its time is not theirs to know otherwise. */
function OtherLeg({
  leg,
  label,
  sameDayAs,
  timeZone,
  locale,
  cancelledLabel,
}: {
  leg: Leg;
  label: string;
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
      <ArrowRight
        aria-hidden
        className="text-ink-soft ml-auto size-4 shrink-0"
      />
    </>
  );

  return (
    <Link
      href={`/pilot/rides/${leg.id}`}
      transitionTypes={["push"]}
      className="border-line hover:bg-canvas-deep flex min-h-12 items-center gap-3 rounded-2xl border p-4 transition-colors motion-reduce:transition-none"
    >
      {body}
    </Link>
  );
}
