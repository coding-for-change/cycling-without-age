import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  TABLE_FRAME,
  TABLE_HEAD,
} from "../../../_components/admin-skeletons";

const ROWS = ["w-32", "w-40", "w-28", "w-36", "w-32"];

export function RequestsHeaderSkeleton() {
  return <PageHeaderSkeleton />;
}

export function RequestRowsSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <Skeleton className="h-8 w-80 max-w-full rounded-lg" />
      <div className={TABLE_FRAME}>
        <div className={TABLE_HEAD} />
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
