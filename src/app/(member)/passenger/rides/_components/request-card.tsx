import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { RideRequestRow } from "@/features/ride-requests";
import { requestedRoute } from "@/features/ride-requests/components/request-words";
import { DateBlock } from "@/features/rides/components/ride-agenda";
import {
  rideCardPlace,
  rideHeadline,
} from "@/features/rides/components/ride-presentation";
import { calendarDate } from "@/lib/calendar";
import {
  formatShortDateWithWeekday,
  formatTimeRange,
  type Locale,
} from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function RequestCard({
  request,
  dict,
  locale,
  words,
}: {
  request: RideRequestRow;
  dict: Dictionary;
  locale: Locale;
  words: Locale;
}) {
  const zone = request.chapter.timeZone;
  const declined = request.status === "declined";
  const route = requestedRoute(request);
  const shape = {
    model: request.model,
    title: null,
    locationName: route.from,
    destinationName: route.to,
  };
  const headline = rideHeadline(shape, dict.calendar, {
    rideTo: dict.calendar.card.rideTo,
    rideFrom: dict.calendar.card.rideFrom,
    words,
  });
  const place = rideCardPlace(shape);
  const time = formatTimeRange(
    request.requestedStartsAt,
    request.requestedEndsAt,
    locale,
    zone,
  );
  const status = declined
    ? dict.passenger.rides.list.declined
    : dict.passenger.rides.list.requested;

  return (
    <li className="relative flex items-center gap-3.5 rounded-2xl border border-line bg-canvas p-3.5 transition-[background-color,scale] has-[a:active]:scale-99 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ink has-[a:hover]:bg-canvas-deep motion-reduce:transition-none">
      <div className={cn("contents", declined && "*:opacity-60")}>
        <DateBlock
          startsAt={request.requestedStartsAt}
          zone={zone}
          locale={locale}
          muted={declined}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            href={`/passenger/rides/requests/${request.id}`}
            transitionTypes={["push"]}
            aria-label={[
              headline,
              formatShortDateWithWeekday(
                calendarDate(request.requestedStartsAt, zone),
                locale,
              ),
              time,
              place,
              status,
            ]
              .filter(Boolean)
              .join(" · ")}
            className="truncate font-display text-base leading-6 font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {headline}
          </Link>
          <p className="flex min-w-0 items-center gap-1.25 text-2sm text-ink-soft">
            <time
              dateTime={request.requestedStartsAt.toISOString()}
              className="shrink-0 tabular-nums"
            >
              {time}
            </time>
            {place ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{place}</span>
              </>
            ) : null}
          </p>
          <span
            className={cn(
              "mt-1 flex w-fit items-center gap-2 rounded-full px-2 text-xs leading-5 font-medium",
              declined ? "bg-canvas-deeper text-ink" : "bg-mint-tint text-ink",
            )}
          >
            {declined ? null : (
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-mint-deep motion-safe:animate-pulse"
              />
            )}
            {status}
          </span>
        </div>
      </div>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-ink-faint"
      />
    </li>
  );
}
