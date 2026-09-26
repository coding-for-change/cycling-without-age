import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  TabsSkeleton,
} from "../../_components/admin-skeletons";

const ROWS = ["w-40", "w-32", "w-44", "w-28", "w-36", "w-32"];

export function TrishawsSkeleton() {
  return (
    <>
      <PageHeaderSkeleton actions={["h-11 w-36 rounded-full"]} />
      <TabsSkeleton widths={["w-20", "w-16", "w-20"]} />
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="h-11 bg-canvas-deep" />
        {ROWS.map((width, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-line px-4 py-3"
          >
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="ml-auto hidden h-4 w-24 md:block" />
            <Skeleton className="hidden h-5 w-16 rounded-full md:block" />
          </div>
        ))}
      </div>
    </>
  );
}
