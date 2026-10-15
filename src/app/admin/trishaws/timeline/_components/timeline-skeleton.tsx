import { Skeleton } from "@/components/ui/skeleton";

const ROWS = ["a", "b", "c", "d"];
const DAYS = ["1", "2", "3", "4", "5", "6", "7"];

export function TimelineGridSkeleton() {
  return (
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
  );
}
