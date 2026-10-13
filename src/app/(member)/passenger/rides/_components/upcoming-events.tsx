import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import { RichText } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { FileImage } from "@/features/fleet/components/file-image";
import { passengers } from "@/features/passengers";
import { rides, type AnnouncedEventRow } from "@/features/rides";
import { calendarDate } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/**
 * Announced events in the chapters of the riders this account books for,
 * while one of them could still come along.
 */
export async function loadUpcomingEvents(userId: string) {
  return rides.listAnnouncedEvents(
    await passengers.listPassengersManagedBy(userId),
  );
}

/**
 * Lifecycle 4B-b: the events a chapter announced, as the people booking for
 * its riders see them — a photo, the story, when and where, and how many seats
 * are left. Never who took the others.
 */
export function UpcomingEvents({
  events,
  dict,
  locale,
  words,
}: {
  events: AnnouncedEventRow[];
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  if (!events.length) return null;
  const strings = dict.passenger.rides.events;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ink-soft text-xs font-semibold tracking-wide uppercase">
        {strings.title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {events.map((event) => (
          <li key={event.id}>
            <EventCard
              event={event}
              dict={dict}
              locale={locale}
              words={words}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EventCard({
  event,
  dict,
  locale,
  words,
}: {
  event: AnnouncedEventRow;
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  const strings = dict.passenger.rides.events;
  const zone = event.chapter.timeZone;
  const left = rides.seatsLeft(event);
  const title = event.title?.trim() || dict.calendar.models.event;
  const photo = event.photos[0]?.fileId ?? null;

  return (
    <Link
      href={`/passenger/rides/${event.id}`}
      transitionTypes={["push"]}
      className="border-line hover:bg-canvas-deep flex h-full flex-col overflow-hidden rounded-2xl border transition-colors motion-reduce:transition-none"
    >
      {photo ? (
        <FileImage
          fileId={photo}
          alt={title}
          className="aspect-video w-full"
        />
      ) : null}
      <span className="flex flex-1 flex-col gap-1.25 p-4">
        <span className="text-2sm text-ink-soft flex items-center gap-1.25">
          <CalendarClock
            aria-hidden
            className="size-3.5 shrink-0"
          />
          {formatShortDateWithWeekday(
            calendarDate(event.startsAt, zone),
            locale,
          )}
          {" · "}
          <time dateTime={event.startsAt.toISOString()}>
            {formatTimeRange(event.startsAt, event.endsAt, locale, zone)}
          </time>
        </span>
        <span className="text-lg font-semibold text-balance">{title}</span>
        {event.locationName ? (
          <span className="text-2sm text-ink-soft flex items-center gap-1.25">
            <MapPin
              aria-hidden
              className="size-3.5 shrink-0"
            />
            {event.locationName}
          </span>
        ) : null}
        {event.description?.trim() ? (
          <RichText
            text={event.description}
            variant="preview"
            className="line-clamp-2 text-sm"
          />
        ) : null}
        <Badge
          className={cn(
            "mt-auto w-fit",
            left === 0
              ? "bg-canvas-deep text-ink-soft"
              : "bg-mint-tint text-ink",
          )}
        >
          {left === null
            ? strings.open
            : formatMessage(strings.seatsLeft, { count: left }, words)}
        </Badge>
      </span>
    </Link>
  );
}
