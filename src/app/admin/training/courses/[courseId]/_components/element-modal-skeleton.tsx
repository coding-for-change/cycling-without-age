import { Skeleton } from "@/components/ui/skeleton";
import { DialogTitle } from "@/components/ui/dialog";

export function ElementModalSkeleton({ label }: { label: string }) {
  return (
    <>
      <DialogTitle className="sr-only">{label}</DialogTitle>
      <div
        aria-busy
        className="flex min-h-16 shrink-0 items-center gap-3 border-b border-line px-4 py-3 sm:px-5"
      >
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-4 w-56 max-w-[50%]" />
        <Skeleton className="ml-auto size-10 rounded-full" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-paper">
        <div className="grid w-full gap-8 px-4 py-5 sm:px-8 sm:py-8">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-11 w-full rounded-(--r-card)" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-72 w-full rounded-(--r-card)" />
            </div>
          </div>
          <div className="grid gap-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-36 w-full rounded-(--r-card)" />
          </div>
        </div>
      </div>
    </>
  );
}
