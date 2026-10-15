import { Skeleton } from "@/components/ui/skeleton";

export function RequestFormFallback() {
  return (
    <>
      <Skeleton className="mx-auto h-1.5 w-20 rounded-full" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
      <Skeleton className="mt-auto h-14 w-full rounded-full" />
    </>
  );
}
