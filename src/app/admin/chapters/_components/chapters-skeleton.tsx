import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "../../_components/admin-skeletons";

const ACTIONS = ["h-11 w-40 rounded-full", "h-11 w-36 rounded-full"];
const ROWS = ["w-40", "w-32", "w-44", "w-28", "w-36"];

export function ChaptersActionsSkeleton() {
  return ACTIONS.map((className, index) => (
    <Skeleton
      key={index}
      className={className}
    />
  ));
}

export function ChaptersHeaderSkeleton() {
  return <PageHeaderSkeleton actions={ACTIONS} />;
}

export function ChapterRowsSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="ml-auto h-9 w-24" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="h-11 bg-canvas-deep" />
        {ROWS.map((width, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-line px-4 py-3"
          >
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="hidden h-3 w-24 md:block" />
            <Skeleton className="ml-auto hidden h-4 w-20 md:block" />
            <Skeleton className="hidden h-4 w-12 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
