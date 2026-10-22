import { Skeleton } from "@/components/ui/skeleton";

const WEEKS = [0, 1, 2, 3, 4];
const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function CalendarFallback() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1">
        <Skeleton className="h-8 w-44" />
        <span className="flex-1" />
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-7">
          {DAYS.map((day) => (
            <span
              key={day}
              className="flex justify-center py-1"
            >
              <Skeleton className="h-4 w-3" />
            </span>
          ))}
        </div>
        {WEEKS.map((week) => (
          <div
            key={week}
            className="grid grid-cols-7"
          >
            {DAYS.map((day) => (
              <span
                key={day}
                className="flex h-13 justify-center pt-1"
              >
                <Skeleton className="size-8 rounded-full" />
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <Skeleton className="h-5 w-48" />
        {[0, 1].map((row) => (
          <div
            key={row}
            className="flex items-center gap-3.5 rounded-2xl border border-line p-3.5"
          >
            <Skeleton className="size-14 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
