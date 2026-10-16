import { Skeleton } from "@/components/ui/skeleton";
import { RideListSkeleton } from "@/features/rides/components/ride-list";
import { RideWeekSkeleton } from "@/features/rides/components/ride-week-skeleton";
import {
  PageHeaderSkeleton,
  TabsSkeleton,
} from "../../_components/admin-skeletons";
import { StickyToolbarSkeleton } from "../../_components/sticky-toolbar";
import type { RidesView } from "../rides-view";

export function RidesSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <RideTabsSkeleton />
      <div className="flex flex-col gap-3">
        <StickyToolbarSkeleton />
        <RideWeekSkeleton />
      </div>
    </>
  );
}

export function RideTabsSkeleton() {
  return <TabsSkeleton widths={["w-12", "w-28"]} />;
}

export function RideBodySkeleton({ view }: { view: RidesView }) {
  return view === "list" ? <RideListSkeleton /> : <RideWeekSkeleton />;
}

export function WeekSwitcherSkeleton() {
  return (
    <div className="flex items-center gap-1.25">
      <Skeleton className="size-8 rounded-md" />
      <Skeleton className="h-8 w-16 rounded-md" />
      <Skeleton className="size-8 rounded-md" />
      <Skeleton className="ml-2 hidden h-4 w-32 lg:block" />
    </div>
  );
}
