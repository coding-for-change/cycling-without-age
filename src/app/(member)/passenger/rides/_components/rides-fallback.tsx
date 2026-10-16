import { Skeleton } from "@/components/ui/skeleton";

export function RidesFallback() {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-11 w-36 rounded-full md:hidden" />
      </div>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </section>
      <Skeleton className="h-11 w-full rounded-lg" />
    </>
  );
}
