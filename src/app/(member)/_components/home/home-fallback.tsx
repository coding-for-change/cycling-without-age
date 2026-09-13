import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fixed sizes, no randomness: these are Suspense fallbacks and get prerendered
 * into the static shell. Each one stands in for exactly one section of the home
 * screen, so nothing on the page moves once the data lands.
 */
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
