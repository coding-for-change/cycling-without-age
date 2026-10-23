import { Skeleton } from "@/components/ui/skeleton";

export function PilotRideFallback() {
  return (
    <>
      <header className="flex flex-col gap-1.25">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </header>
      <Skeleton className="aspect-2/1 w-full rounded-2xl" />
      <section className="flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        {[0, 1].map((row) => (
          <div
            key={row}
            className="flex items-center gap-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </section>
      <section className="flex flex-col gap-3 border-t border-line pt-5">
        <Skeleton className="h-5 w-28" />
        {[0, 1].map((row) => (
          <div
            key={row}
            className="flex items-center gap-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </section>
    </>
  );
}
