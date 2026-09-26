import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "../../_components/admin-skeletons";

const ROWS = ["w-40", "w-52", "w-32"];

function SectionSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        {ROWS.map((width, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0"
          >
            <Skeleton className="size-9 rounded-lg" />
            <div className="grid gap-1">
              <Skeleton className={`h-4 ${width}`} />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="ml-auto hidden h-4 w-20 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LocationsSkeleton() {
  return (
    <>
      <PageHeaderSkeleton
        actions={["h-11 w-32 rounded-full", "h-11 w-36 rounded-full"]}
      />
      <div className="grid gap-10">
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    </>
  );
}
