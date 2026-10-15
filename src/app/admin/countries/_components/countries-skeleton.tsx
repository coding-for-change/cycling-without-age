import { Skeleton } from "@/components/ui/skeleton";

const ROWS = ["w-32", "w-28", "w-36", "w-24"];

export const NEW_COUNTRY = "h-11 w-36 rounded-full";

export function CountryRowsSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-9 w-64 max-w-full" />
      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="h-11 bg-canvas-deep" />
        {ROWS.map((width, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-t border-line px-4 py-3"
          >
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="ml-auto hidden h-6 w-24 rounded-full md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
