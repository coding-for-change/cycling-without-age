import { CalendarClock } from "lucide-react";
import { perspectiveViewerSession } from "@/lib/auth-guards";
import { cacheLife } from "next/cache";
import { getDictionary } from "@/lib/i18n";
import type { MemberPerspective } from "../../nav";
import { MEMBER_LIFE } from "../instant";
import { EmptyState } from "@/components/empty-state";

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
      <EmptyState
        icon={CalendarClock}
        className="flex-none"
      >
        {nextRide[perspective].empty}
      </EmptyState>
    </section>
  );
}
