import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import {
  ChevronLeft,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";
import { RichText } from "@/components/markdown";
import { chapters } from "@/features/chapters";
import { chat } from "@/features/chat";
import { passengers } from "@/features/passengers";
import { rides, type PassengerRideDetailRow } from "@/features/rides";
import { requirePerspective } from "@/lib/auth-guards";
import { calendarDate } from "@/lib/calendar";
import {
  formatDateMedium,
  resolveLocale,
  wordsLocale,
  type Locale,
} from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { fullName } from "@/lib/utils";
import { MEMBER_LIFE } from "../../../../_components/instant";
import { ChapterMail } from "../../_components/chapter-mail";
import { BookSeats } from "./book-seats";
import { EventInvite, seatLabels } from "./event-invite";
import { RideHero } from "./ride-hero";

export async function RideDetail({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  const { rideId } = await params;
  return <PassengerRide rideId={rideId} />;
}

async function PassengerRide({ rideId }: { rideId: string }) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("passenger");
  const [mine, managed, dict, language, head] = await Promise.all([
    passengers.listRidersOfAccount(session.user.id),
    passengers.listPassengersManagedBy(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const riderIds = mine.map((passenger) => passenger.id);
  const ride = await rides.getRideForPassengers(rideId, riderIds);
  if (!ride)
    return (
      <EventInvite
        rideId={rideId}
        riders={managed}
        dict={dict}
        language={language}
        locale={resolveLocale(head.get("accept-language"))}
        words={wordsLocale(language)}
      />
    );

  const booked = new Set(ride.roster.map(({ passenger }) => passenger.id));
  const moreRiders = managed.filter(
    (rider) => rider.chapterId === ride.chapter.id && !booked.has(rider.id),
  );
  const seatsLeft = rides.seatsLeft(ride);
  const canBookMore =
    ride.announced &&
    ride.status === "scheduled" &&
    ride.startsAt > new Date() &&
    moreRiders.length > 0 &&
    seatsLeft !== 0;

  const [settings, wayThereOpen, wayBackOpen, chatId] = await Promise.all([
    chapters.getSettings(ride.chapter.id),
    ride.returnLegOf
      ? rides.passengersCanOpen(ride.returnLegOf.id, riderIds)
      : false,
    ride.returnLeg
      ? rides.passengersCanOpen(ride.returnLeg.id, riderIds)
      : false,
    chat.getRideConversationId(ride.id, session.user.id),
  ]);
  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const strings = dict.passenger.rides;

  return (
    <>
      <Link
        href="/passenger/rides"
        transitionTypes={["pop"]}
        className="-ml-2 flex min-h-11 items-center gap-1 self-start rounded-full pr-3 pl-1 text-sm text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none motion-reduce:transition-none"
      >
        <ChevronLeft
          aria-hidden
          className="size-5"
        />
        {dict.member.pages.rides.title}
      </Link>

      <RideHero
        ride={ride}
        wayThereOpen={wayThereOpen}
        wayBackOpen={wayBackOpen}
        dict={dict}
        locale={locale}
        words={words}
      />

      <RideState
        ride={ride}
        strings={strings}
      />

      {ride.description?.trim() ? (
        <Section title={strings.detail.about}>
          <RichText
            text={ride.description}
            className="text-sm"
          />
        </Section>
      ) : null}

      <Section title={strings.detail.riders}>
        <ul className="flex flex-col gap-3">
          {ride.roster.map(({ id, passenger }) => (
            <Person key={id}>{fullName(passenger)}</Person>
          ))}
        </ul>
      </Section>

      <RidePilots
        ride={ride}
        strings={strings}
        words={words}
      />

      {chatId ? (
        <Link
          href={`/passenger/chat/${chatId}`}
          transitionTypes={["push"]}
          className="flex min-h-12 items-center gap-3 rounded-2xl border border-line p-4 transition-colors hover:bg-canvas-deep motion-reduce:transition-none"
        >
          <MessageCircle
            aria-hidden
            className="size-5 shrink-0"
          />
          <span className="font-medium">{strings.detail.message}</span>
        </Link>
      ) : null}

      {canBookMore ? (
        <BookSeats
          rideId={ride.id}
          riders={moreRiders.map((rider) => ({
            id: rider.id,
            name: fullName(rider),
          }))}
          seatsLeft={seatsLeft}
          language={language}
          labels={{
            ...seatLabels(dict),
            title: strings.events.book.more,
          }}
        />
      ) : null}

      <Section title={dict.member.home.yourChapter}>
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <div className="flex items-start gap-3">
            <MapPin
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-mint-deep"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-medium">{ride.chapter.name}</span>
              {ride.chapter.address ? (
                <span className="text-2sm text-ink-soft">
                  {ride.chapter.address}
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-sm">
            {formatMessage(
              strings.detail.contact,
              { chapter: ride.chapter.name },
              words,
            )}
          </p>
          {settings.replyToEmail?.trim() ? (
            <ChapterMail
              email={settings.replyToEmail.trim()}
              subject={formatMessage(
                strings.detail.subject,
                {
                  date: formatDateMedium(
                    calendarDate(ride.startsAt, ride.chapter.timeZone),
                    locale,
                  ),
                },
                words,
              )}
              label={strings.write}
            />
          ) : null}
        </div>
      </Section>
    </>
  );
}

type RideStrings = Dictionary["passenger"]["rides"];

function RideState({
  ride,
  strings,
}: {
  ride: PassengerRideDetailRow;
  strings: RideStrings;
}) {
  if (ride.status === "cancelled")
    return (
      <section
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-line p-4"
      >
        <Info
          aria-hidden
          className="mt-0.5 size-5 shrink-0"
        />
        <div className="flex min-w-0 flex-col gap-1.25">
          <h2 className="text-base">{strings.detail.cancelled}</h2>
          <p className="text-sm">
            {strings.reasons[ride.cancellationReasonCode ?? "other"]}
          </p>
          <p className="text-sm text-ink-soft">
            {strings.detail.cancelledHint}
          </p>
        </div>
      </section>
    );

  if (ride.status === "completed")
    return (
      <p className="rounded-2xl bg-canvas-deep p-4 text-sm">
        {strings.detail.completed}
      </p>
    );

  return null;
}

function RidePilots({
  ride,
  strings,
  words,
}: {
  ride: PassengerRideDetailRow;
  strings: RideStrings;
  words: Locale;
}) {
  const pilots = ride.assignments.filter(
    (assignment) => assignment.role === "pilot",
  );
  return (
    <Section
      title={formatMessage(
        strings.detail.pilot,
        { count: Math.max(pilots.length, 1) },
        words,
      )}
    >
      {pilots.length ? (
        <ul className="flex flex-col gap-3">
          {pilots.map(({ user }) => (
            <Person
              key={user.id}
              action={
                user.phoneNumber ? (
                  <a
                    href={`tel:${user.phoneNumber.replace(/[^\d+]/g, "")}`}
                    aria-label={formatMessage(
                      strings.detail.call,
                      { name: user.name },
                      words,
                    )}
                    className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.25 rounded-full border border-line px-3 text-2sm tabular-nums transition-colors hover:bg-canvas-deep motion-reduce:transition-none"
                  >
                    <Phone
                      aria-hidden
                      className="size-4"
                    />
                    {user.phoneNumber}
                  </a>
                ) : null
              }
            >
              {user.name}
            </Person>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-medium">{strings.detail.pilotPending}</p>
          <p className="text-sm text-ink-soft">
            {strings.detail.pilotPendingHint}
          </p>
        </div>
      )}
    </Section>
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

function Person({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint-tint">
        <UserRound
          aria-hidden
          className="size-4"
        />
      </span>
      <span className="min-w-0 font-medium">{children}</span>
      {action}
    </li>
  );
}
