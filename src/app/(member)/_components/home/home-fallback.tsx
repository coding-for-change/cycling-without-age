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

export function TilesFallback() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Skeleton className="h-28 rounded-(--r-tile)" />
      <Skeleton className="h-28 rounded-(--r-tile)" />
    </div>
  );
}

export function EventsFallback() {
  return (
    <section className="flex flex-col gap-3">
      <Skeleton className="h-6 w-56" />
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-64 w-64 shrink-0 rounded-soft" />
        <Skeleton className="h-64 w-64 shrink-0 rounded-soft" />
      </div>
    </section>
  );
}
