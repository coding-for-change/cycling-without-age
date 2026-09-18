import { Skeleton } from "@/components/ui/skeleton";

const ROW_WIDTHS = ["72%", "58%", "84%", "46%", "66%", "52%", "78%", "60%"];
const BUBBLE_WIDTHS = ["58%", "42%", "70%", "36%", "64%", "48%"];

export function ChatListSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 px-4 py-4">
      <Skeleton className="h-9 w-full rounded-md" />
      {ROW_WIDTHS.map((width, index) => (
        <div
          key={index}
          className="flex items-center gap-3"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton
              className="h-3 rounded"
              style={{ width }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-end gap-4 px-4 py-4">
        {BUBBLE_WIDTHS.map((width, index) => (
          <Skeleton
            key={index}
            className={
              index % 2 === 0 ? "h-10 rounded-xl" : "h-10 self-end rounded-xl"
            }
            style={{ width }}
          />
        ))}
      </div>

      <div className="shrink-0 border-t border-line px-4 py-3">
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
