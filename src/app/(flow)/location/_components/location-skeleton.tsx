import { Skeleton } from "@/components/ui/skeleton";

export function LocationSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <Skeleton className="h-[45dvh] w-full rounded-none lg:h-auto lg:flex-1" />
      <div className="flex w-full flex-col gap-3 p-5 lg:w-[27rem]">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-11 w-full rounded-full" />
        {[0, 1, 2, 3].map((row) => (
          <Skeleton
            key={row}
            className="h-14 w-full rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
