import { Skeleton } from "@/components/ui/skeleton";

export function GreetingFallback() {
  return (
    <section className="flex flex-col gap-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-64 max-w-full" />
      <Skeleton className="mt-2 h-14 w-full rounded-full md:hidden" />
    </section>
  );
}

export function SectionFallback() {
  return (
    <section className="flex flex-col gap-3">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </section>
  );
}
