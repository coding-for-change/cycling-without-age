import { Skeleton } from "@/components/ui/skeleton";

export function RidesFallback() {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-11 w-36 rounded-full md:hidden" />
      </div>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="flex items-center gap-3.5 rounded-2xl border border-line p-3.5"
          >
            <Skeleton className="size-14 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </section>
      <Skeleton className="h-5 w-40" />
    </>
  );
}
