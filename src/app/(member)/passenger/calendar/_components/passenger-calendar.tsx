import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { RideCard } from "@/features/rides/components/ride-agenda";
import { requirePerspective } from "@/lib/auth-guards";
import { formatTimeRange, resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import {
  calendarFrame,
  calendarProps,
  calendarStrings,
  entryDay,
  WEEK_STARTS_ON,
  type AgendaEntry,
} from "../../../_components/calendar/calendar-data";
import { JoinCard } from "../../../_components/calendar/join-card";
import { MemberCalendar } from "../../../_components/calendar/member-calendar";
import { MEMBER_LIFE } from "../../../_components/instant";
import { pilotAvatars } from "../../../_components/pilot-avatars";
import { RequestCard } from "../../rides/_components/request-card";
import { loadRideRequests } from "../../rides/_components/ride-requests-list";
import { loadUpcomingEvents } from "../../rides/_components/upcoming-events";

const rideHref = (rideId: string) => `/passenger/rides/${rideId}`;
const PROFILE_BASE = "/passenger/profile";
const NEW_RIDE = "/passenger/rides/new";

export async function PassengerCalendar({ month }: { month: string | null }) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("passenger");
  const userId = session.user.id;
  const [riders, requests, events, dict, language, head] = await Promise.all([
    passengers.listRidersOfAccount(userId),
    loadRideRequests(userId),
    loadUpcomingEvents(userId),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const frame = await calendarFrame(
    [
      ...riders.map((rider) => rider.chapterId),
      ...session.access.memberships.map((membership) => membership.chapterId),
    ],
    month,
  );
  const mine = await rides.listRidesForPassengers(
    riders.map((rider) => rider.id),
    frame.from,
    frame.to,
  );
  const avatars = await pilotAvatars(mine);

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const eventStrings = dict.passenger.rides.events.bar;
  const booked = new Set(mine.map((ride) => ride.id));
  const now = frame.now.getTime();

  const entries: AgendaEntry[] = [
    ...mine.map((ride) => ({
      id: `ride:${ride.id}`,
      day: entryDay(ride.startsAt, ride.chapter.timeZone),
      at: ride.startsAt.getTime(),
      kind: "mine" as const,
      muted: ride.status === "cancelled",
      node: (
        <RideCard
          key={`ride:${ride.id}`}
          ride={ride}
          strings={dict.calendar}
          locale={locale}
          words={words}
          href={rideHref(ride.id)}
          profileBase={PROFILE_BASE}
          past={ride.endsAt.getTime() <= now}
          pilotAvatars={avatars}
        />
      ),
    })),
    ...events
      .filter((event) => !booked.has(event.id))
      .map((event) => {
        const zone = event.chapter.timeZone;
        const left = rides.seatsLeft(event);
        return {
          id: `event:${event.id}`,
          day: entryDay(event.startsAt, zone),
          at: event.startsAt.getTime(),
          kind: "join" as const,
          node: (
            <JoinCard
              key={`event:${event.id}`}
              rideId={event.id}
              href={rideHref(event.id)}
              title={event.title?.trim() || dict.calendar.models.event}
              time={formatTimeRange(event.startsAt, event.endsAt, locale, zone)}
              startsAt={event.startsAt}
              status={
                left === null
                  ? eventStrings.open
                  : formatMessage(
                      eventStrings.spotsLeft,
                      { count: left },
                      words,
                    )
              }
              photo={event.photos[0]?.fileId ?? null}
            />
          ),
        };
      }),
    ...requests
      .filter((request) => request.status === "pending")
      .map((request) => ({
        id: `request:${request.id}`,
        day: entryDay(request.requestedStartsAt, request.chapter.timeZone),
        at: request.requestedStartsAt.getTime(),
        kind: "pending" as const,
        node: (
          <RequestCard
            key={`request:${request.id}`}
            request={request}
            dict={dict}
            locale={locale}
            words={words}
          />
        ),
      })),
  ];

  return (
    <MemberCalendar
      month={frame.month}
      today={frame.today}
      weekStartsOn={WEEK_STARTS_ON}
      locale={locale}
      words={words}
      strings={calendarStrings(dict, dict.member.action.passenger)}
      bookHref={NEW_RIDE}
      {...calendarProps(entries, frame.month, frame.today)}
    />
  );
}
