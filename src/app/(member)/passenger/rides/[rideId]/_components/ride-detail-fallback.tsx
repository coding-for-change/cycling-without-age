import { Skeleton } from "@/components/ui/skeleton";

export function RideDetailFallback() {
  return (
    <>
      <header className="flex flex-col gap-1.25">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </header>
      <Skeleton className="aspect-2/1 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <section className="flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="flex items-center gap-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </section>
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-full" />
        <Skeleton className="h-12 flex-1 rounded-full" />
      </div>
    </>
  );
}
