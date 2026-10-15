import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft, MapPin } from "lucide-react";
import { RichText } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { FileImage } from "@/features/fleet/components/file-image";
import { rides } from "@/features/rides";
import { calendarDate } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import type { Dictionary, Locale as UiLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { fullName } from "@/lib/utils";
import { BookSeats, type BookSeatsLabels } from "./book-seats";

type Rider = {
  id: string;
  firstName: string;
  lastName: string;
  chapterId: string;
};

export const seatLabels = (dict: Dictionary): BookSeatsLabels => {
  const { book, errors } = dict.passenger.rides.events;
  return { ...book, errors: { ...dict.common.errors, ...errors } };
};

/**
 * An announced event before this account has booked it: the photos, the
 * story, when and where, and the seats still free. No other rider's name.
 */
export async function EventInvite({
  rideId,
  riders,
  dict,
  language,
  locale,
  words,
}: {
  rideId: string;
  riders: Rider[];
  dict: Dictionary;
  language: UiLocale;
  locale: Locale;
  words: Locale;
}) {
  const event = await rides.getAnnouncedEvent(rideId, [
    ...new Set(riders.map((rider) => rider.chapterId)),
  ]);
  if (!event) notFound();

  const strings = dict.passenger.rides.events;
  const zone = event.chapter.timeZone;
  const left = rides.seatsLeft(event);
  const title = event.title?.trim() || dict.calendar.models.event;
  const bookable = riders.filter(
    (rider) => rider.chapterId === event.chapterId,
  );

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

      {event.photos.length ? (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto">
          {event.photos.map((photo) => (
            <FileImage
              key={photo.fileId}
              fileId={photo.fileId}
              alt={title}
              className="aspect-video w-full shrink-0 snap-center rounded-2xl"
            />
          ))}
        </div>
      ) : null}

      <header className="flex flex-col gap-1.25">
        <Badge className="bg-mint-tint text-ink w-fit">{strings.badge}</Badge>
        <h1 className="text-2xl tracking-tight md:text-3xl">{title}</h1>
        <p className="text-ink-soft flex flex-wrap items-center gap-x-1.25">
          <CalendarClock
            aria-hidden
            className="size-4 shrink-0"
          />
          {formatShortDateWithWeekday(
            calendarDate(event.startsAt, zone),
            locale,
          )}
          <span aria-hidden>·</span>
          <time dateTime={event.startsAt.toISOString()}>
            {formatTimeRange(event.startsAt, event.endsAt, locale, zone)}
          </time>
        </p>
        <p className="text-2sm text-ink-soft">{event.chapter.name}</p>
      </header>

      {event.locationName || event.locationAddress ? (
        <div className="border-line flex items-start gap-3 rounded-2xl border p-4">
          <MapPin
            aria-hidden
            className="text-mint-deep mt-0.5 size-4 shrink-0"
          />
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">
              {event.locationName ?? event.locationAddress}
            </span>
            {event.locationName && event.locationAddress ? (
              <span className="text-2sm text-ink-soft">
                {event.locationAddress}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}

      {event.description?.trim() ? (
        <RichText
          text={event.description}
          className="text-sm"
        />
      ) : null}

      <p className="text-sm font-medium">
        {left === null
          ? strings.open
          : formatMessage(strings.seatsLeft, { count: left }, words)}
      </p>

      {left !== 0 && bookable.length ? (
        <div className="mt-auto flex flex-col pt-4">
          <BookSeats
            rideId={event.id}
            riders={bookable.map((rider) => ({
              id: rider.id,
              name: fullName(rider),
            }))}
            seatsLeft={left}
            language={language}
            labels={seatLabels(dict)}
          />
        </div>
      ) : null}
    </>
  );
}
