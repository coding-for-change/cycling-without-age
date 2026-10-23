import { headers } from "next/headers";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { recentActivity } from "@/use-cases/admin-overview";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { chapterZones } from "../chapter-zones";
import { ActivityFeed } from "./activity-feed";
import { withHandOverNames } from "./hand-over-names";

const SHOWN = 7;

export async function OverviewActivity({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, chapterIds }, dict, language, head] = await Promise.all([
    readActiveScope(searchParams, "overview"),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const [events, zoneOf] = await Promise.all([
    recentActivity(chapterIds, SHOWN).then(withHandOverNames),
    chapterZones(chapterIds),
  ]);

  return (
    <ActivityFeed
      events={events}
      viewerId={session.user.id}
      labels={{
        ...dict.admin.history,
        riderHandedOver: dict.admin.passengers.detail.handedOver,
      }}
      empty={dict.admin.overview.activity.empty}
      notation={resolveLocale(head.get("accept-language"))}
      words={language}
      timeZone={zoneOf()}
    />
  );
}
