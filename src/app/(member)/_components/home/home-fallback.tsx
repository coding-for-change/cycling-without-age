import { Skeleton } from "@/components/ui/skeleton";

export function GreetingFallback() {
  return (
    <section className="flex flex-col gap-3">
      <Skeleton className="h-8 w-48" />
    </section>
  );
}

export function HomeHeroFallback() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-4 rounded-2xl bg-paper p-5 shadow-lift">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="mt-1 h-4 w-28" />
        </div>
        <Skeleton className="h-25 w-22 shrink-0 rounded-xl" />
      </div>
      <Skeleton className="mt-2 h-14 w-full rounded-full md:hidden" />
    </section>
  );
}

export function HappeningSoonFallback() {
  return (
    <section className="flex flex-col gap-3">
      <Skeleton className="h-3.5 w-28" />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 lg:-mx-6 lg:px-6">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="flex w-64 shrink-0 flex-col gap-3 sm:w-72"
          >
            <Skeleton className="aspect-4/3 w-full rounded-2xl" />
            <div className="flex flex-col gap-2 px-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
