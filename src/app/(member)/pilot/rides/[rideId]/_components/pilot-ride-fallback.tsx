import { Skeleton } from "@/components/ui/skeleton";

export function PilotRideFallback() {
  return (
    <>
      <Skeleton className="h-5 w-24" />
      <section className="flex flex-col gap-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </section>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </section>
    </>
  );
}
