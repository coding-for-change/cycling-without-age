import { cn } from "@/lib/utils";

export function PresenceDot({
  online,
  className,
}: {
  online: boolean;
  className?: string;
}) {
  if (!online) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "size-2.5 rounded-full bg-mint ring-2 ring-canvas",
        className,
      )}
    />
  );
}
