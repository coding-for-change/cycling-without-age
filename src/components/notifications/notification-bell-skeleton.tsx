import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function NotificationBellSkeleton({
  className,
}: {
  className?: string;
}) {
  return <Skeleton className={cn("size-9 shrink-0 rounded-full", className)} />;
}
