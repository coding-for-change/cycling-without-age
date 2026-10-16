import Link from "next/link";
import { ChevronRight, Hourglass, CalendarX2 } from "lucide-react";
import { rideRequests, type RideRequestRow } from "@/features/ride-requests";
import {
  requestedRiders,
  requestedWhen,
} from "@/features/ride-requests/components/request-words";
import { formatList, type Locale } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";

/**
 * The requests an account is still waiting on, and the ones the chapter
 * turned down lately. A scheduled request is a ride by now and shows as one.
 */
export async function loadRideRequests(userId: string, now = new Date()) {
  return (await rideRequests.listOfUser(userId, now)).filter(
    (request) =>
      (request.status === "pending" || request.status === "declined") &&
      request.requestedEndsAt > now,
  );
}

export function RideRequestsList({
  requests,
  dict,
  notation,
  words,
}: {
  requests: RideRequestRow[];
  dict: Dictionary;
  notation: Locale;
  words: Locale;
}) {
  if (!requests.length) return null;
  const strings = dict.passenger.request;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {strings.list.title}
      </h2>
      <ul className="flex flex-col gap-3">
        {requests.map((request) => {
          const when = requestedWhen(request, notation, { short: true });
          const Icon = request.status === "pending" ? Hourglass : CalendarX2;
          return (
            <li key={request.id}>
              <Link
                href={`/passenger/rides/requests/${request.id}`}
                transitionTypes={["push"]}
                className="flex items-center gap-3 rounded-2xl border border-line p-4 transition-colors hover:bg-canvas-deep focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none motion-reduce:transition-none"
              >
                <Icon
                  aria-hidden
                  className="size-5 shrink-0 text-mint-ink"
                />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-medium">
                    {formatMessage(
                      strings.list.status[
                        request.status === "pending" ? "pending" : "declined"
                      ],
                      { chapter: request.chapter.name },
                      words,
                    )}
                  </span>
                  <span className="truncate text-2sm text-ink-soft">
                    {[
                      formatMessage(dict.common.dateTime, when, words),
                      formatList(requestedRiders(request), words),
                    ].join(" · ")}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-ink-soft"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
