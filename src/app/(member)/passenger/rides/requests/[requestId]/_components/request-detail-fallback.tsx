import { Skeleton } from "@/components/ui/skeleton";

export function RequestDetailFallback() {
  return (
    <>
      <Skeleton className="h-5 w-24" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-11 w-40 rounded-full" />
    </>
  );
}
