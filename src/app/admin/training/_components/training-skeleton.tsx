import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  TABLE_FRAME,
  TABLE_HEAD,
} from "../../_components/admin-skeletons";

const ROWS = ["w-44", "w-36", "w-52", "w-32", "w-40", "w-36"];
const ACTION = "h-11 w-36 rounded-full";

export function TrainingActionSkeleton() {
  return <Skeleton className={ACTION} />;
}

export function TrainingHeaderSkeleton({
  action = false,
}: {
  action?: boolean;
}) {
  return <PageHeaderSkeleton actions={action ? [ACTION] : []} />;
}

export function CourseRowsSkeleton() {
  return (
    <div className={TABLE_FRAME}>
      <div className={TABLE_HEAD} />
      {ROWS.map((width, index) => (
        <div
          key={index}
          className="flex min-h-14 items-center gap-3 border-t border-line px-4 py-3"
        >
          <div className="grid flex-1 gap-1.5">
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="hidden h-6 w-16 rounded-md md:block" />
          <Skeleton className="hidden h-5 w-20 rounded-full md:block" />
          <Skeleton className="hidden h-5 w-20 rounded-full md:block" />
          <Skeleton className="hidden h-4 w-28 lg:block" />
          <Skeleton className="hidden h-4 w-28 lg:block" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}
