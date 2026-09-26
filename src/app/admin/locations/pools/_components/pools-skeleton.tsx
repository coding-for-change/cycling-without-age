import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  TabsSkeleton,
} from "../../../_components/admin-skeletons";

const ROWS = ["w-40", "w-52", "w-32", "w-44"];

export function PoolsSkeleton() {
  return (
    <>
      <PageHeaderSkeleton actions={["h-11 w-32 rounded-full"]} />
      <TabsSkeleton widths={["w-24", "w-16"]} />
      <Skeleton className="-mt-2 h-4 w-96 max-w-full" />
      <div className="overflow-hidden rounded-2xl border border-line">
        {ROWS.map((width, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-t border-line px-4 py-3 first:border-t-0"
          >
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="ml-auto hidden h-4 w-24 sm:block" />
            <Skeleton className="hidden h-4 w-12 sm:block" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </>
  );
}
