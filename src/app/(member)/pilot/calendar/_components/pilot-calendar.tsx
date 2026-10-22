import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { rides } from "@/features/rides";
import { RideCard } from "@/features/rides/components/ride-agenda";
import { requirePerspective } from "@/lib/auth-guards";
import { formatTimeRange, resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { listOpenRides } from "@/use-cases/open-rides";
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
import { pilotChapterIds } from "../../rides/_components/open-rides";

const rideHref = (rideId: string) => `/pilot/rides/${rideId}`;
const PROFILE_BASE = "/pilot/profile";

export async function PilotCalendar({ month }: { month: string | null }) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const session = await requirePerspective("pilot");
  const userId = session.user.id;
  const chapterIds = pilotChapterIds(session.access);
  const [frame, open, dict, language, head] = await Promise.all([
    calendarFrame(
      chapterIds.length
        ? chapterIds
        : session.access.memberships.map((membership) => membership.chapterId),
      month,
    ),
    listOpenRides(userId, chapterIds),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const mine = await rides.listRidesForPilot(userId, frame.from, frame.to);
  const avatars = await pilotAvatars(mine);

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
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
    ...open.map((ride) => {
      const zone = ride.chapter.timeZone;
      return {
        id: `open:${ride.id}`,
        day: entryDay(ride.startsAt, zone),
        at: ride.startsAt.getTime(),
        kind: "join" as const,
        node: (
          <JoinCard
            key={`open:${ride.id}`}
            rideId={ride.id}
            href={rideHref(ride.id)}
            title={ride.title?.trim() || dict.calendar.models[ride.model]}
            time={formatTimeRange(ride.startsAt, ride.endsAt, locale, zone)}
            startsAt={ride.startsAt}
            status={formatMessage(
              dict.pilot.rides.open.needsMore,
              {
                count: Math.max(
                  1,
                  ride.requiredPilots - ride._count.assignments,
                ),
              },
              words,
            )}
            photo={null}
          />
        ),
      };
    }),
  ];

  return (
    <MemberCalendar
      month={frame.month}
      today={frame.today}
      weekStartsOn={WEEK_STARTS_ON}
      locale={locale}
      words={words}
      strings={calendarStrings(dict, null)}
      bookHref={null}
      {...calendarProps(entries, frame.month, frame.today)}
    />
  );
}
