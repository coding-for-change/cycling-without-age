import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({ actions = [] }: { actions?: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Skeleton className="h-9 w-44" />
      {actions.length > 0 ? (
        <div className="flex gap-2">
          {actions.map((className, index) => (
            <Skeleton
              key={index}
              className={className}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TabsSkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="-mt-3 flex gap-1 border-b border-line">
      {widths.map((width, index) => (
        <Skeleton
          key={index}
          className={cn("mx-3 my-3 h-5", width)}
        />
      ))}
    </div>
  );
}

export function KpiTilesSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 md:mx-0 md:grid md:grid-cols-2 md:px-0 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,1fr))]">
      {["w-16", "w-12", "w-14", "w-12", "w-24"].map((label, index) => (
        <div
          key={index}
          className={cn(
            "flex h-32 w-44 shrink-0 flex-col gap-3 rounded-2xl border border-line p-4 md:w-auto",
            index === 0 && "w-52 md:col-span-2 lg:col-span-1",
          )}
        >
          <div className="flex justify-between">
            <Skeleton className={cn("h-4", label)} />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className={cn("h-8", index === 0 ? "w-28" : "w-20")} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
