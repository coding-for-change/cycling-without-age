import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AttentionSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-line rounded-2xl border border-line">
      {["w-3/5", "w-2/3", "w-1/2", "w-3/5"].map((width, index) => (
        <div
          key={index}
          className="flex min-h-14 items-center gap-3 px-4 py-2.75"
        >
          <Skeleton className="size-7 shrink-0 rounded-lg" />
          <Skeleton className={cn("h-4", width)} />
          <Skeleton className="ml-auto h-3 w-12" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function WeekSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[2, 1].map((count, day) => (
        <div
          key={day}
          className="flex flex-col gap-1"
        >
          <Skeleton className="mx-1 h-3 w-16" />
          <div className="flex flex-col divide-y divide-line rounded-2xl border border-line">
            {Array.from({ length: count }, (_, index) => (
              <div
                key={index}
                className="flex min-h-11 items-center gap-3 px-4 py-2"
              >
                <Skeleton className="h-3 w-28 shrink-0" />
                <Skeleton className="size-4 shrink-0" />
                <Skeleton className={cn("h-4", index ? "w-1/3" : "w-1/2")} />
                <Skeleton className="ml-auto h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {["w-4/5", "w-3/5", "w-2/3", "w-1/2", "w-3/4"].map((width, index) => (
        <div
          key={index}
          className="flex items-center gap-3"
        >
          <Skeleton className="size-4 shrink-0 rounded-full" />
          <Skeleton className={cn("h-3", width)} />
        </div>
      ))}
    </div>
  );
}
