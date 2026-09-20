import { Users } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { cn } from "@/lib/utils";
import { PresenceDot } from "./presence-dot";

const FALLBACK_SIZE = {
  sm: "size-6",
  default: "size-8",
  lg: "size-10",
} as const;

export function ChatAvatar({
  svg,
  online = false,
  size = "default",
  className,
}: {
  svg: string | null;
  online?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {svg ? (
        <PersonAvatar
          svg={svg}
          size={size}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "grid shrink-0 place-items-center rounded-full bg-mint-tint text-ink",
            FALLBACK_SIZE[size],
          )}
        >
          <Users className="size-4" />
        </span>
      )}
      <PresenceDot
        online={online}
        className="absolute right-0 bottom-0"
      />
    </span>
  );
}
