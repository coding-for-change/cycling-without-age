import { Skeleton } from "@/components/ui/skeleton";

export function FinishFallback() {
  return (
    <>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </section>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </section>
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </section>
    </>
  );
}
