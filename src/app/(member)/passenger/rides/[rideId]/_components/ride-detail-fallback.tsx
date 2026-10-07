import { Skeleton } from "@/components/ui/skeleton";

export function RideDetailFallback() {
  return (
    <>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </section>
    </>
  );
}
