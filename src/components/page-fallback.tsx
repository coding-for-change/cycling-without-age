import { Skeleton } from "@/components/ui/skeleton";

export function PageFallback() {
  return (
    <>
      <Skeleton className="h-9 w-44" />
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-6 pt-16">
        <Skeleton className="mb-2 size-10 rounded-lg" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-4 w-52 max-w-full" />
      </div>
    </>
  );
}
