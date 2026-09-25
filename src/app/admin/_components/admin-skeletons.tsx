import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton({
  actions,
}: {
  actions: [string, ...string[]];
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Skeleton className="h-9 w-44" />
      <div className="flex gap-2">
        {actions.map((className, index) => (
          <Skeleton
            key={index}
            className={className}
          />
        ))}
      </div>
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
