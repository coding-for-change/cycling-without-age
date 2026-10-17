import { Skeleton } from "@/components/ui/skeleton";

export function PilotRidesFallback() {
  return (
    <>
      <Skeleton className="h-9 w-44" />
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </section>
      <Skeleton className="h-11 w-full rounded-xl" />
    </>
  );
}
