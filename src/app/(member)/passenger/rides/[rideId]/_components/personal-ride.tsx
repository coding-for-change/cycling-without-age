import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarClock, MessageCircle, Phone } from "lucide-react";
import { FindingPilot, TrishawIllustration } from "@/components/illustrations";
import { PersonAvatar } from "@/components/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PassengerRideDetailRow } from "@/features/rides";
import { OpenInMapsSheet } from "@/features/rides/components/open-in-maps-sheet";
import { rideHeadline } from "@/features/rides/components/ride-presentation";
import { StaticMap } from "@/features/rides/components/static-map";
import { hasStaticMap } from "@/features/rides/components/static-map-url";
import { calendarDate } from "@/lib/calendar";
import { formatDateMedium, formatTime, type Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { MemberTitle } from "../../../../_components/member-title";
import { PersonalHeader } from "../../../../_components/ride-detail/personal-header";
import { TimelineStop } from "../../../../_components/ride-detail/timeline-stop";
import { ChapterMail } from "../../../../_components/chapter-mail";
import {
  ChapterPhones,
  type ChapterPhone,
} from "../../../../_components/chapter-phones";
import { CancelRideButton } from "./cancel-ride-button";
import type { PilotFace } from "./pilot-faces";

type Strings = Dictionary["passenger"]["rides"];

export function PersonalRide({
  ride,
  pilots,
  phones,
  chatId,
  chapterEmail,
  adminPhones,
  wayThereOpen,
  wayBackOpen,
  holdsSeat,
  now,
  seats,
  dict,
  locale,
  words,
}: {
  ride: PassengerRideDetailRow;
  pilots: PilotFace[];
  phones: Record<string, string>;
  chatId: string | null;
  chapterEmail: string | null;
  adminPhones: ChapterPhone[];
  wayThereOpen: boolean;
  wayBackOpen: boolean;
  holdsSeat: boolean;
  now: Date;
  seats: ReactNode;
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  const strings = dict.passenger.rides;
  const detail = strings.detail;
  const zone = ride.chapter.timeZone;
  const scheduled = ride.status === "scheduled";
  const ahead = scheduled && ride.startsAt > now;
  const headline = rideHeadline(ride, dict.calendar, {
    rideTo: dict.calendar.card.rideTo,
    rideFrom: dict.calendar.card.rideFrom,
    words,
  });

  const start = ride.locationName?.trim() || ride.locationAddress?.trim();
  const startAddress =
    ride.locationName?.trim() && ride.locationAddress?.trim()
      ? ride.locationAddress
      : null;
  const pickupPlace = {
    name: ride.locationName,
    address: ride.locationAddress,
    latitude: ride.latitude,
    longitude: ride.longitude,
  };
  const map = Boolean(start) && hasStaticMap(ride.latitude, ride.longitude);
  const destination =
    ride.model === "functional"
      ? ride.destinationName?.trim() || ride.destinationAddress?.trim()
      : null;
  const back =
    wayBackOpen && ride.returnLeg && ride.returnLeg.status !== "cancelled"
      ? ride.returnLeg
      : null;
  const there = wayThereOpen && ride.returnLegOf ? ride.returnLegOf : null;
  const changeFrom = !there
    ? ride.id
    : there.status === "scheduled" && there.startsAt > now
      ? there.id
      : null;
  const trishaw = ride.trishaws[0]?.trishaw.name ?? null;

  return (
    <>
      <MemberTitle title={headline} />
      <PersonalHeader
        badge={
          ride.status !== "scheduled" ? (
            <Badge
              className={cn(
                "w-fit",
                ride.status === "cancelled"
                  ? "bg-canvas-deeper text-ink"
                  : "bg-mint-tint text-ink",
              )}
            >
              {ride.status === "cancelled"
                ? detail.state.cancelled
                : detail.state.completed}
            </Badge>
          ) : null
        }
        title={headline}
        startsAt={ride.startsAt}
        endsAt={ride.endsAt}
        timeZone={zone}
        locale={locale}
      />

      <RideState
        ride={ride}
        strings={strings}
      />

      {map && start ? (
        <OpenInMapsSheet
          place={pickupPlace}
          strings={dict.member.rides.map}
          words={words}
        >
          <StaticMap
            lat={ride.latitude}
            lng={ride.longitude}
            label={formatMessage(detail.mapOf, { place: start }, words)}
          />
        </OpenInMapsSheet>
      ) : null}

      {pilots.length || ahead ? (
        <PilotCard
          pilots={pilots}
          phones={phones}
          chatId={chatId}
          strings={strings}
          words={words}
        />
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-base">{detail.day}</h2>
        <ol className="flex flex-col">
          <TimelineStop
            kind="pickup"
            title={formatMessage(
              detail.pickupAt,
              { time: formatTime(ride.startsAt, locale, zone) },
              words,
            )}
          >
            {start ? (
              <>
                <span>{start}</span>
                {startAddress ? (
                  <span className="text-2sm text-ink-soft">{startAddress}</span>
                ) : null}
                {map ? null : (
                  <OpenInMapsSheet
                    place={pickupPlace}
                    strings={dict.member.rides.map}
                    words={words}
                    className="w-fit"
                  >
                    <span className="text-2sm underline underline-offset-4">
                      {detail.openInMaps}
                    </span>
                  </OpenInMapsSheet>
                )}
              </>
            ) : (
              <span className="text-ink-soft">{detail.placeTbd}</span>
            )}
          </TimelineStop>
          {destination ? (
            <TimelineStop
              kind="arrive"
              title={formatMessage(detail.arriveAt, { destination }, words)}
            >
              {ride.destinationName?.trim() &&
              ride.destinationAddress?.trim() ? (
                <span className="text-2sm text-ink-soft">
                  {ride.destinationAddress}
                </span>
              ) : null}
            </TimelineStop>
          ) : null}
          {back ? (
            <TimelineStop
              kind="return"
              title={formatMessage(
                detail.returnAt,
                { time: formatTime(back.startsAt, locale, zone) },
                words,
              )}
              href={`/passenger/rides/${back.id}`}
            />
          ) : null}
          {there ? (
            <TimelineStop
              kind="pickup"
              title={formatMessage(
                detail.wayThereAt,
                { time: formatTime(there.startsAt, locale, zone) },
                words,
              )}
              href={`/passenger/rides/${there.id}`}
            />
          ) : null}
        </ol>
      </section>

      {trishaw ? (
        <section className="flex items-center gap-4 rounded-2xl bg-mint-tint p-4">
          <TrishawIllustration className="w-24 shrink-0" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-display text-base font-semibold text-balance">
              {formatMessage(detail.trishaw, { name: trishaw }, words)}
            </p>
            <p className="text-2sm text-ink-soft">
              {formatMessage(
                detail.trishawHint,
                { chapter: ride.chapter.name },
                words,
              )}
            </p>
          </div>
        </section>
      ) : null}

      {seats}

      {ahead && holdsSeat ? (
        <div className="flex flex-wrap gap-3">
          {changeFrom ? (
            <Button
              asChild
              variant="outline"
              className="min-h-12 flex-1 rounded-full border-line"
            >
              <Link
                href={`/passenger/rides/new?from=${changeFrom}`}
                transitionTypes={["push"]}
              >
                <CalendarClock aria-hidden />
                {detail.changeTime}
              </Link>
            </Button>
          ) : null}
          <CancelRideButton
            rideId={ride.id}
            leaveTo="/passenger/rides"
            labels={detail.cancelRide}
            errors={{ ...dict.common.errors, ...strings.seat.errors }}
          />
        </div>
      ) : null}

      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <h2 className="text-base">{detail.help}</h2>
        <p className="text-sm text-ink-soft">
          {formatMessage(detail.contact, { chapter: ride.chapter.name }, words)}
        </p>
        <ChapterPhones
          phones={adminPhones}
          call={detail.call}
          words={words}
        />
        {chapterEmail ? (
          <ChapterMail
            email={chapterEmail}
            subject={formatMessage(
              detail.subject,
              {
                date: formatDateMedium(
                  calendarDate(ride.startsAt, zone),
                  locale,
                ),
              },
              words,
            )}
            label={strings.write}
          />
        ) : null}
      </section>
    </>
  );
}

export function RideState({
  ride,
  strings,
}: {
  ride: PassengerRideDetailRow;
  strings: Strings;
}) {
  if (ride.status === "cancelled")
    return (
      <section
        role="status"
        className="flex flex-col gap-1.25 rounded-2xl bg-canvas-deep p-4"
      >
        <h2 className="text-base">{strings.detail.cancelled}</h2>
        <p className="text-sm">
          {strings.reasons[ride.cancellationReasonCode ?? "other"]}
        </p>
        <p className="text-sm text-ink-soft">{strings.detail.cancelledHint}</p>
      </section>
    );

  if (ride.status === "completed")
    return (
      <p className="rounded-2xl bg-mint-tint p-4 text-sm">
        {strings.detail.completed}
      </p>
    );

  return null;
}

function PilotCard({
  pilots,
  phones,
  chatId,
  strings,
  words,
}: {
  pilots: PilotFace[];
  phones: Record<string, string>;
  chatId: string | null;
  strings: Strings;
  words: Locale;
}) {
  const detail = strings.detail;
  const callable = pilots.filter((pilot) => phones[pilot.id]);

  return (
    <section
      aria-label={formatMessage(
        detail.pilot,
        { count: Math.max(pilots.length, 1) },
        words,
      )}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-4"
    >
      {pilots.length ? (
        <ul className="flex flex-col gap-4">
          {pilots.map((pilot) => (
            <li
              key={pilot.id}
              className="flex items-center gap-3"
            >
              <PersonAvatar
                svg={pilot.svg}
                photoUrl={pilot.photoUrl}
                size="lg"
                className="size-14"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-display text-base font-semibold text-balance">
                  {formatMessage(detail.yourPilot, { name: pilot.name }, words)}
                </p>
                {pilot.bio ? (
                  <p className="line-clamp-2 text-2sm text-ink-soft">
                    {pilot.bio}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-1.25 py-1 text-center">
          <FindingPilot className="w-56" />
          <p className="font-display text-base font-semibold text-balance">
            {detail.findingPilot}
          </p>
          <p className="text-sm text-ink-soft">{detail.pilotPendingHint}</p>
        </div>
      )}

      {chatId || callable.length ? (
        <div className="flex flex-wrap gap-3">
          {chatId ? (
            <Button
              asChild
              variant="outline"
              className="min-h-11 flex-1 rounded-full border-line"
            >
              <Link
                href={`/passenger/chat/${chatId}`}
                transitionTypes={["push"]}
                aria-label={detail.message}
              >
                <MessageCircle aria-hidden />
                {detail.chat}
              </Link>
            </Button>
          ) : null}
          {callable.map((pilot) => (
            <Button
              key={pilot.id}
              asChild
              variant="outline"
              className="min-h-11 flex-1 rounded-full border-line"
            >
              <a
                href={`tel:${phones[pilot.id].replace(/[^\d+]/g, "")}`}
                aria-label={formatMessage(
                  detail.call,
                  { name: pilot.name },
                  words,
                )}
              >
                <Phone aria-hidden />
                {callable.length > 1
                  ? formatMessage(detail.call, { name: pilot.name }, words)
                  : detail.callShort}
              </a>
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
