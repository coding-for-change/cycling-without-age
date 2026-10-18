import { Skeleton } from "@/components/ui/skeleton";

export function RidesFallback() {
  return (
    <>
      <Skeleton className="h-9 w-44" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        {["a", "b"].map((day) => (
          <div
            key={day}
            className="flex flex-col gap-2"
          >
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ))}
      </div>
    </>
  );
}
