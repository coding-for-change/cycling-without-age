import { formatBadge } from "@/components/notifications/inbox-row";
import { cn } from "@/lib/utils";

export function ChatBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const label = formatBadge(count);
  if (!label) return null;

  return (
    <span
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full bg-mint-deep px-1.5 text-xs font-medium text-white",
        className,
      )}
    >
      {label}
    </span>
  );
}
