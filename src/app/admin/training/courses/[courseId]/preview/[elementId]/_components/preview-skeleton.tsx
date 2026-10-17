import { Skeleton } from "@/components/ui/skeleton";

export function PreviewSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-24" />
      <div className="mx-auto grid w-full max-w-2xl justify-items-center gap-4 pt-10">
        <Skeleton className="size-28 rounded-full" />
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="mt-4 h-14 w-full max-w-sm rounded-full" />
      </div>
    </>
  );
}
