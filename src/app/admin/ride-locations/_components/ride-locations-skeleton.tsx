import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "../../_components/admin-skeletons";

const ROWS = ["w-40", "w-32", "w-44", "w-28", "w-36"];

export function RideLocationsSkeleton() {
  return (
    <>
      <PageHeaderSkeleton actions={["h-11 w-44 rounded-full"]} />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="h-11 bg-canvas-deep" />
        {ROWS.map((width, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-line px-4 py-3"
          >
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="hidden h-5 w-24 rounded-full md:block" />
            <Skeleton className="ml-auto hidden h-4 w-40 md:block" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}
