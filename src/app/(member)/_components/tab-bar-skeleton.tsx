import { Skeleton } from "@/components/ui/skeleton";

export function TabBarSkeleton() {
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <Skeleton className="h-(--tabbar-h) w-full max-w-md rounded-full" />
    </div>
  );
}
