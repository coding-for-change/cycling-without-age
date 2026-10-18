import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Hero, type HeroName } from "@/components/art";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  illustration,
  hero,
  title,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  illustration?: string;
  /** A drawn scene from `@/components/art` in place of the icon. */
  hero?: HeroName;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("rounded-2xl border border-line", className)}>
      <EmptyHeader>
        {hero ? (
          <EmptyMedia>
            <Hero
              name={hero}
              className="w-56 max-w-full"
            />
          </EmptyMedia>
        ) : illustration ? (
          <EmptyMedia>
            <span
              aria-hidden
              style={{ backgroundImage: `url(${illustration})` }}
              className="block size-32 bg-contain bg-center bg-no-repeat"
            />
          </EmptyMedia>
        ) : (
          <EmptyMedia
            variant="icon"
            className="bg-mint-tint text-ink"
          >
            <Icon aria-hidden />
          </EmptyMedia>
        )}
        {title ? (
          <EmptyTitle className="font-display font-bold text-balance">
            {title}
          </EmptyTitle>
        ) : null}
        <EmptyDescription className="text-ink-soft">
          {children}
        </EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
