import { CalendarClock } from "lucide-react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { EmptyState } from "@/components/empty-state";
import { passengers } from "@/features/passengers";
import { rides } from "@/features/rides";
import { RideAgenda } from "@/features/rides/components/ride-agenda";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import type { MemberPerspective } from "../../nav";
import { MEMBER_LIFE } from "../instant";

// A member plans in weeks, not months — far enough to see what is coming,
// near enough that the list stays a list.
const HORIZON_MS = 28 * 24 * 60 * 60 * 1000;

export async function NextRideCard({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [session, dict, language, head] = await Promise.all([
    perspectiveViewerSession(perspective),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const upcoming = session
    ? await listUpcomingRides(perspective, session.user.id)
    : [];
  const { nextRide } = dict.member.home;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {upcoming.length > 0 ? dict.calendar.upcoming : nextRide.title}
      </h2>
      {upcoming.length > 0 ? (
        <RideAgenda
          rides={upcoming}
          strings={dict.calendar}
          locale={resolveLocale(head.get("accept-language"))}
          words={wordsLocale(language)}
        />
      ) : (
        <EmptyState
          icon={CalendarClock}
          className="flex-none"
        >
          {nextRide[perspective].empty}
        </EmptyState>
      )}
    </section>
  );
}

async function listUpcomingRides(
  perspective: MemberPerspective,
  userId: string,
) {
  const from = new Date();
  const to = new Date(from.getTime() + HORIZON_MS);
  if (perspective === "pilot") return rides.listRidesForPilot(userId, from, to);

  const mine = await passengers.listPassengersManagedBy(userId);
  return rides.listRidesForPassengers(
    mine.map((passenger) => passenger.id),
    from,
    to,
  );
}
