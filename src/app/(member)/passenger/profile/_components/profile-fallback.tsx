import { Skeleton } from "@/components/ui/skeleton";

const STOPS = ["account", "about", "character", "text", "people", "more"];

export function ProfileFallback() {
  return (
    <div className="flex flex-col gap-9">
      <div className="grid justify-items-center gap-3 pt-5">
        <Skeleton className="size-28 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <ol className="flex flex-col">
        {STOPS.map((stop) => (
          <li
            key={stop}
            className="group grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4"
          >
            <div className="flex flex-col items-center">
              <Skeleton className="size-11 rounded-full" />
              <span className="w-0.5 flex-1 bg-line group-last:hidden" />
            </div>
            <div className="flex flex-col gap-3 pt-2 pb-10 group-last:pb-0">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-60 max-w-full" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
