import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "../../../_components/admin-skeletons";

const ROWS = ["w-32", "w-40", "w-28", "w-36", "w-32"];

export function RequestsHeaderSkeleton() {
  return <PageHeaderSkeleton />;
}

export function RequestRowsSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex gap-1.25">
        {["w-20", "w-24", "w-20", "w-24", "w-12"].map((width, index) => (
          <Skeleton
            key={index}
            className={`h-8 rounded-full ${width}`}
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="h-11 bg-canvas-deep" />
        {ROWS.map((width, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-line px-4 py-3"
          >
            <Skeleton className={`h-8 ${width}`} />
            <Skeleton className="hidden h-4 w-40 md:block" />
            <Skeleton className="ml-auto hidden h-4 w-24 md:block" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
