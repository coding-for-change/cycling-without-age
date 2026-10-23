import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  TABLE_FRAME,
  TABLE_HEAD,
} from "../../_components/admin-skeletons";

const ROWS = ["w-36", "w-44", "w-32", "w-40", "w-28", "w-36"];

export function PassengersHeaderSkeleton() {
  return <PageHeaderSkeleton actions={["h-11 w-40 rounded-full"]} />;
}

export function PassengerRowsSkeleton() {
  return (
    <div className={TABLE_FRAME}>
      <div className={TABLE_HEAD} />
      {ROWS.map((width, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-t border-line px-4 py-3"
        >
          <Skeleton className="size-9 rounded-full" />
          <div className="grid gap-1">
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="ml-auto hidden h-4 w-28 md:block" />
          <Skeleton className="hidden h-4 w-20 md:block" />
        </div>
      ))}
    </div>
  );
}
