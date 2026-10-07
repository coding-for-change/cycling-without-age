import type { ReactNode } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Flag,
  MapPin,
  Navigation,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import type { PassengerRideDetailRow } from "@/features/rides";
import { MODEL_ICON } from "@/features/rides/components/ride-presentation";
import { calendarDate } from "@/lib/calendar";
import {
  formatLongDateWithWeekday,
  formatTime,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import { googleMapsUrl } from "@/lib/geo";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/**
 * When and where, in the chapter's own zone: a relative reading this from
 * another country still sees the time the bell actually rings.
 */
export function RideHero({
  ride,
  wayThereOpen,
  wayBackOpen,
  dict,
  locale,
  words,
}: {
  ride: PassengerRideDetailRow;
  /** A rider booked only on the way back cannot open the way there. */
  wayThereOpen: boolean;
  /** Only a rider booked on the way back has a way back to be told about. */
  wayBackOpen: boolean;
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  const strings = dict.passenger.rides;
  const zone = ride.chapter.timeZone;
  const cancelled = ride.status === "cancelled";
  const ModelIcon = MODEL_ICON[ride.model];
  const eyebrow =
    (ride.model === "event" ? ride.title?.trim() : null) ||
    dict.calendar.models[ride.model];

  const start = ride.locationName?.trim() || ride.locationAddress?.trim();
  const startAddress =
    ride.locationName?.trim() && ride.locationAddress?.trim()
      ? ride.locationAddress
      : null;
  const maps = start
    ? googleMapsUrl({
        address: ride.locationAddress,
        latitude: ride.latitude,
        longitude: ride.longitude,
      })
    : null;
  const destination =
    ride.model === "functional"
      ? ride.destinationName?.trim() || ride.destinationAddress?.trim()
      : null;
  const back =
    wayBackOpen && ride.returnLeg && ride.returnLeg.status !== "cancelled"
      ? ride.returnLeg
      : null;

  return (
    <section
      aria-labelledby="ride-when"
      className={cn(
        "flex flex-col gap-4 rounded-2xl p-5",
        cancelled ? "bg-canvas-deep" : "bg-mint-tint",
      )}
    >
      <div className="flex flex-col gap-1.25">
        <p className="text-2sm flex items-center gap-1.25 text-ink-soft">
          <ModelIcon
            aria-hidden
            className="size-4 shrink-0"
          />
          {eyebrow}
        </p>
        <h1
          id="ride-when"
          className="text-2xl tracking-tight md:text-3xl"
        >
          {formatLongDateWithWeekday(calendarDate(ride.startsAt, zone), locale)}
        </h1>
        <time
          dateTime={ride.startsAt.toISOString()}
          className="font-display text-lg"
        >
          {formatTimeRange(ride.startsAt, ride.endsAt, locale, zone)}
        </time>
      </div>

      <ul className="flex flex-col gap-3">
        <HeroLine icon={MapPin}>
          {start ? (
            <>
              <span>
                {formatMessage(
                  strings.detail.startsAt,
                  { place: start },
                  words,
                )}
              </span>
              {startAddress ? (
                <span className="text-2sm text-ink-soft">{startAddress}</span>
              ) : null}
              {maps ? (
                <a
                  href={maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2sm flex min-h-11 items-center gap-1.25 self-start underline underline-offset-4 hover:text-ink-soft"
                >
                  {strings.detail.openInMaps}
                  <ExternalLink
                    aria-hidden
                    className="size-3.5"
                  />
                </a>
              ) : null}
            </>
          ) : (
            <span className="text-ink-soft">{strings.detail.placeTbd}</span>
          )}
        </HeroLine>

        {destination ? (
          <HeroLine icon={Flag}>
            <span>
              {formatMessage(strings.detail.to, { destination }, words)}
            </span>
            {ride.destinationName?.trim() && ride.destinationAddress?.trim() ? (
              <span className="text-2sm text-ink-soft">
                {ride.destinationAddress}
              </span>
            ) : null}
          </HeroLine>
        ) : null}

        {back ? (
          <HeroLine icon={Undo2}>
            <Link
              href={`/passenger/rides/${back.id}`}
              transitionTypes={["push"]}
              className="self-start underline underline-offset-4 hover:text-ink-soft"
            >
              {formatMessage(
                strings.detail.andBack,
                { time: formatTime(back.startsAt, locale, zone) },
                words,
              )}
            </Link>
          </HeroLine>
        ) : null}

        {ride.returnLegOf ? (
          <HeroLine icon={Navigation}>
            {wayThereOpen ? (
              <Link
                href={`/passenger/rides/${ride.returnLegOf.id}`}
                transitionTypes={["push"]}
                className="self-start underline underline-offset-4 hover:text-ink-soft"
              >
                {formatMessage(
                  strings.detail.wayBack,
                  { time: formatTime(ride.returnLegOf.startsAt, locale, zone) },
                  words,
                )}
              </Link>
            ) : (
              <span>
                {formatMessage(
                  strings.detail.wayBack,
                  { time: formatTime(ride.returnLegOf.startsAt, locale, zone) },
                  words,
                )}
              </span>
            )}
          </HeroLine>
        ) : null}
      </ul>
    </section>
  );
}

function HeroLine({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <Icon
        aria-hidden
        className="mt-0.5 size-5 shrink-0"
      />
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </li>
  );
}
