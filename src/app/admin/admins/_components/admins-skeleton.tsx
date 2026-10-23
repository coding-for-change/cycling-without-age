import { Skeleton } from "@/components/ui/skeleton";
import { TABLE_FRAME, TABLE_HEAD } from "../../_components/admin-skeletons";

export const INVITE_BUTTON = "h-11 w-44 rounded-full";

const ROWS = ["w-32", "w-40", "w-28"];

export function AdminsSectionSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className={TABLE_FRAME}>
        <div className={TABLE_HEAD} />
        {ROWS.map((width, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-line px-4 py-3"
          >
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="ml-auto hidden h-6 w-20 rounded-full md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
