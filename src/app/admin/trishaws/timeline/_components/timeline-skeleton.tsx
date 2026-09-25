import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  TabsSkeleton,
} from "../../../_components/admin-skeletons";

const ROWS = ["a", "b", "c", "d"];
const DAYS = ["1", "2", "3", "4", "5", "6", "7"];

export function TimelineSkeleton() {
  return (
    <>
      <PageHeaderSkeleton actions={["h-9 w-56"]} />
      <TabsSkeleton widths={["w-20", "w-16", "w-20"]} />
      <div className="grid gap-3">
        {ROWS.map((row) => (
          <div
            key={row}
            className="grid gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center"
          >
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <Skeleton
                  key={day}
                  className="h-12 rounded-lg"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
