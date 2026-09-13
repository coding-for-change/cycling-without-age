import { CalendarClock } from "lucide-react";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { cacheLife } from "next/cache";
import { getDictionary } from "@/lib/i18n";
import type { MemberPerspective } from "../../nav";
import { MEMBER_LIFE } from "../instant";
import { MemberEmpty } from "../member-empty";

/**
 * There is no ride model yet, so this is the empty state and nothing else —
 * written to say what will appear here rather than that something is missing.
 */
export async function NextRideCard({
  perspective,
}: {
  perspective: MemberPerspective;
}) {
  "use cache: private";
  cacheLife(MEMBER_LIFE);

  const [, dict] = await Promise.all([
    perspectiveViewerSession(perspective),
    getDictionary(),
  ]);
  const { nextRide } = dict.member.home;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {nextRide.title}
      </h2>
      <MemberEmpty
        icon={CalendarClock}
        className="flex-none"
      >
        {nextRide[perspective].empty}
      </MemberEmpty>
    </section>
  );
}
