import { rideRequests } from "@/features/ride-requests";
import { getDictionary } from "@/lib/i18n";
import { AdminTabs } from "../../_components/admin-tabs";
import { TabsSkeleton } from "../../_components/admin-skeletons";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";

export type RideTab = "rides" | "requests";

/** Rides and the Ride Request List are two views of one job: the chapter's calendar. */
export async function RideTabs({
  searchParams,
  current,
}: {
  searchParams: Promise<AdminSearchParams>;
  current: RideTab;
}) {
  const [{ chapterIds, scopeQuery }, dict] = await Promise.all([
    readActiveScope(searchParams, "rides"),
    getDictionary(),
  ]);
  const waiting = await rideRequests.countPending(chapterIds);
  const strings = dict.admin.rideRequests.tabs;

  return (
    <AdminTabs
      label={strings.label}
      current={current}
      scopeQuery={scopeQuery}
      tabs={[
        { key: "rides", href: "/admin/rides", label: strings.rides },
        {
          key: "requests",
          href: "/admin/rides/requests",
          label: strings.requests,
          count: waiting,
        },
      ]}
    />
  );
}

export function RideTabsSkeleton() {
  return <TabsSkeleton widths={["w-12", "w-28"]} />;
}
