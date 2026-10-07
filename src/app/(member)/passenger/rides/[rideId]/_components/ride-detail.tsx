import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Info, MapPin, UserRound } from "lucide-react";
import { RichText } from "@/components/markdown";
import { chapters } from "@/features/chapters";
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
import { RideHero } from "./ride-hero";

export async function RideDetail({
  params,
}: {
  params: Promise<{ rideId: string }>;
}) {
  const { rideId } = await params;
  return <PassengerRide rideId={rideId} />;
}

/**
 * Only a ride one of this account's riders is on, and only those riders: a
 * relative sees their mother on the ride, not the neighbours sharing the bench.
 * There is nothing to press here yet — members act on rides in a later step.
 */
async function PassengerRide({ rideId }: { rideId: string }) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("passenger");
  const [mine, dict, language, head] = await Promise.all([
    passengers.listPassengersManagedBy(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const riderIds = mine.map((passenger) => passenger.id);
  const ride = await rides.getRideForPassengers(rideId, riderIds);
  if (!ride) notFound();

  const [settings, wayThere] = await Promise.all([
    chapters.getSettings(ride.chapter.id),
    ride.returnLegOf
      ? rides.getRideForPassengers(ride.returnLegOf.id, riderIds)
      : null,
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
        wayThereOpen={wayThere !== null}
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

/** A cancelled ride is explained in words, never by its reason code. */
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
            <Person key={user.id}>{user.name}</Person>
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

function Person({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint-tint">
        <UserRound
          aria-hidden
          className="size-4"
        />
      </span>
      <span className="min-w-0 font-medium">{children}</span>
    </li>
  );
}
