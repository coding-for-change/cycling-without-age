import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  TabsSkeleton,
  TABLE_FRAME,
  TABLE_HEAD,
} from "../../_components/admin-skeletons";

const ROWS = ["w-40", "w-32", "w-44", "w-28", "w-36", "w-32"];
const CREATE = "h-11 w-36 rounded-full";

export const FLEET_TAB_WIDTHS = ["w-20", "w-16", "w-20"];
export const WEEK_SWITCHER = "h-9 w-56";

export function FleetActionSkeleton({
  className = CREATE,
}: {
  className?: string;
}) {
  return <Skeleton className={className} />;
}

export function FleetHeaderSkeleton({
  action = CREATE,
  intro = false,
}: {
  action?: string;
  intro?: boolean;
}) {
  return (
    <>
      <PageHeaderSkeleton actions={[action]} />
      <TabsSkeleton widths={FLEET_TAB_WIDTHS} />
      {intro ? <Skeleton className="-mt-2 h-4 w-96 max-w-full" /> : null}
    </>
  );
}

export function TrishawRowsSkeleton() {
  return (
    <div className={TABLE_FRAME}>
      <div className={TABLE_HEAD} />
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
  );
}
