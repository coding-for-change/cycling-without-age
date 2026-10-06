import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { KpiTilesSkeleton } from "../../_components/admin-skeletons";
import { StickyToolbarSkeleton } from "../../_components/sticky-toolbar";

function CardSkeleton({
  className,
  title = "w-32",
  children,
}: {
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-line p-4 md:p-5",
        className,
      )}
    >
      <div className="flex min-h-8 items-center justify-between">
        <div className="flex flex-col gap-1">
          <Skeleton className={cn("h-4", title)} />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="hidden h-4 w-48 md:block" />
      </div>
      {children}
    </div>
  );
}

const BAR_HEIGHTS = [
  "h-1/3",
  "h-1/2",
  "h-2/5",
  "h-3/5",
  "h-1/2",
  "h-4/5",
  "h-2/3",
  "h-1/2",
  "h-3/4",
  "h-3/5",
  "h-2/3",
  "h-5/6",
];

export function TrendChartSkeleton() {
  return (
    <CardSkeleton title="w-20">
      <div className="flex h-56 items-end gap-3 md:h-72">
        {BAR_HEIGHTS.map((height, index) => (
          <Skeleton
            key={index}
            className={cn("flex-1 rounded-b-none", height)}
          />
        ))}
      </div>
    </CardSkeleton>
  );
}

export function FilterBarSkeleton() {
  return (
    <StickyToolbarSkeleton>
      <div className="hidden h-8 items-center gap-3 md:flex">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="ml-auto h-8 w-36 rounded-lg" />
      </div>
      <div className="flex h-10 items-center gap-3 md:hidden">
        <div className="flex flex-1 flex-col gap-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </StickyToolbarSkeleton>
  );
}

const RANK_WIDTHS = [
  "w-full",
  "w-5/6",
  "w-3/4",
  "w-2/3",
  "w-3/5",
  "w-1/2",
  "w-2/5",
  "w-1/3",
  "w-1/4",
  "w-1/5",
];

function PlaceSkeleton() {
  return (
    <CardSkeleton>
      <Skeleton className="-mx-4 -mb-4 h-80 rounded-none rounded-b-2xl md:-mx-5 md:-mb-5 md:h-96 lg:h-auto lg:min-h-96 lg:flex-1" />
    </CardSkeleton>
  );
}

function RankingsSkeleton() {
  return (
    <CardSkeleton title="w-24">
      <div className="flex h-9 items-end gap-5 border-b border-line pb-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid gap-0.5">
        {RANK_WIDTHS.map((width, index) => (
          <div
            key={index}
            className="flex min-h-11 items-center gap-3"
          >
            <Skeleton className="h-3 w-5" />
            <div className="grid flex-1 gap-2">
              <div className="flex justify-between gap-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-8" />
              </div>
              <Skeleton className={cn("h-1", width)} />
            </div>
            <Skeleton className="h-3 w-6" />
          </div>
        ))}
      </div>
    </CardSkeleton>
  );
}

function BarRowsSkeleton({ rows, gap }: { rows: number; gap: string }) {
  return (
    <div className={cn("grid", gap)}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="grid gap-2"
        >
          <div className="flex justify-between gap-3">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-10" />
          </div>
          <Skeleton className="h-2 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function CancellationsSkeleton() {
  return (
    <CardSkeleton title="w-28">
      <div className="flex items-center gap-5">
        <Skeleton className="size-28 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
      <BarRowsSkeleton
        rows={4}
        gap="gap-3"
      />
    </CardSkeleton>
  );
}

function ModelSplitSkeleton() {
  return (
    <CardSkeleton title="w-24">
      <BarRowsSkeleton
        rows={3}
        gap="gap-5"
      />
    </CardSkeleton>
  );
}

function PeopleHealthSkeleton() {
  return (
    <CardSkeleton title="w-32">
      <BarRowsSkeleton
        rows={2}
        gap="gap-5"
      />
      <div className="flex items-end justify-between gap-3 border-t border-line pt-4">
        <div className="grid gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-7 w-16" />
      </div>
    </CardSkeleton>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <FilterBarSkeleton />
      <KpiTilesSkeleton />
      <TrendChartSkeleton />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <PlaceSkeleton />
        <RankingsSkeleton />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <CancellationsSkeleton />
        <ModelSplitSkeleton />
        <PeopleHealthSkeleton />
      </div>
    </div>
  );
}
