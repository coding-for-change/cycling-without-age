import type { LucideIcon } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/**
 * What an admin surface shows when it has nothing to list: the page's own icon
 * in a mint disc over one line of explanation. Every list uses this, so an
 * empty chapters table and an empty members table read the same way.
 */
export function AdminEmpty({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("rounded-2xl border border-line", className)}>
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="bg-mint-tint text-ink"
        >
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyDescription className="text-ink-soft">
          {children}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
