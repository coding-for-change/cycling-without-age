import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const HOURS = 10;
const BLOCKS: Record<number, { top: number; height: number }[]> = {
  0: [{ top: 2, height: 1.5 }],
  2: [
    { top: 1, height: 1 },
    { top: 5, height: 2 },
  ],
  3: [{ top: 3, height: 1.5 }],
  5: [{ top: 6, height: 1 }],
};

export function RideWeekSkeleton() {
  return (
    <div
      aria-hidden
      className="-mx-4 md:mx-0"
    >
      <div className="border-line flex items-center gap-1.25 border-b px-2 pb-2 md:hidden">
        <Skeleton className="size-9 rounded-md" />
        <div className="grid flex-1 grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 py-1"
            >
              <Skeleton className="h-3 w-3" />
              <Skeleton className="size-7 rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="size-9 rounded-md" />
      </div>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] md:grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        <div className="max-md:hidden" />
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="border-line flex justify-center border-b px-1 pb-2 max-md:hidden"
          >
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
        <div className="border-line border-r">
          {Array.from({ length: HOURS }, (_, i) => (
            <div
              key={i}
              className="flex h-14 justify-end pr-2"
            >
              <Skeleton className="-mt-1.5 h-3 w-6" />
            </div>
          ))}
        </div>
        {Array.from({ length: 7 }, (_, day) => (
          <div
            key={day}
            className={cn(
              "border-line relative border-r",
              day > 0 && "max-md:hidden",
            )}
          >
            {Array.from({ length: HOURS }, (_, i) => (
              <div
                key={i}
                className="border-line h-14 border-b"
              />
            ))}
            {(BLOCKS[day] ?? []).map((block, i) => (
              <Skeleton
                key={i}
                className="absolute inset-x-1 rounded-md"
                style={{
                  top: `${block.top * 3.5}rem`,
                  height: `${block.height * 3.5}rem`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
