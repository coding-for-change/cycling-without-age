import { Skeleton } from "@/components/ui/skeleton";

export function RideFallback() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="mt-5 h-4 w-16" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    </>
  );
}
