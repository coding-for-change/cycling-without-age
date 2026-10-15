import { CalendarHeart, ChevronDown } from "lucide-react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { RideAgenda } from "@/features/rides/components/ride-agenda";
import { requirePerspective } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MEMBER_LIFE } from "../../../_components/instant";
import { RideRequestsList, loadRideRequests } from "./ride-requests-list";
import { UpcomingEvents, loadUpcomingEvents } from "./upcoming-events";

const rideHref = (rideId: string) => `/passenger/rides/${rideId}`;

export async function PassengerRides() {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("passenger");
  const [mine, events, requests, dict, language, head] = await Promise.all([
    passengers.listRidersOfAccount(session.user.id),
    loadUpcomingEvents(session.user.id),
    loadRideRequests(session.user.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const { upcoming, past } = await rides.listPassengerRides(
    mine.map((passenger) => passenger.id),
  );

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const strings = dict.passenger.rides;

  return (
    <>
      <h1 className="text-2xl tracking-tight md:text-3xl">
        {dict.member.pages.rides.title}
      </h1>

      <RideRequestsList
        requests={requests}
        dict={dict}
        notation={locale}
        words={words}
      />

      <UpcomingEvents
        events={events}
        dict={dict}
        locale={locale}
        words={words}
      />

      {upcoming.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {dict.calendar.upcoming}
          </h2>
          <RideAgenda
            rides={upcoming}
            strings={dict.calendar}
            locale={locale}
            words={words}
            href={rideHref}
          />
        </section>
      ) : requests.length ? null : (
        <EmptyState
          icon={CalendarHeart}
          className="flex-1 justify-start rounded-none border-none pt-16"
          action={
            <Button
              asChild
              variant="brand"
              className="min-h-11 rounded-full px-6"
            >
              <Link
                href="/passenger/rides/new"
                transitionTypes={["push"]}
              >
                {dict.member.action.passenger}
              </Link>
            </Button>
          }
        >
          {dict.passenger.request.list.empty}
        </EmptyState>
      )}

      {past.length ? (
        <details className="group flex flex-col">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
              {strings.past}
            </h2>
            <span className="text-2sm flex items-center gap-1.25 text-ink-soft">
              {formatMessage(strings.pastCount, { count: past.length }, words)}
              <ChevronDown
                aria-hidden
                className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </span>
          </summary>
          <div className="pt-3">
            <RideAgenda
              rides={past}
              strings={dict.calendar}
              locale={locale}
              words={words}
              href={rideHref}
            />
          </div>
        </details>
      ) : null}
    </>
  );
}
