import { RideWeekSkeleton } from "@/features/rides/components/ride-week-skeleton";
import { PageHeaderSkeleton } from "../../_components/admin-skeletons";
import { StickyToolbarSkeleton } from "../../_components/sticky-toolbar";

export function RidesSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-3">
        <StickyToolbarSkeleton />
        <RideWeekSkeleton />
      </div>
    </>
  );
}
