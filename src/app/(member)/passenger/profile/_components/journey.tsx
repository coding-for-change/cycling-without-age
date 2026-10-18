import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * The profile as one route: each section a stop on a mint line, the way a
 * ride runs from pick-up to drop-off, and each stop one of mockup 2's cards.
 * Mint, not red — red stays the one primary action (docs-internal/BRAND.md).
 */
export function Journey({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col">{children}</ol>;
}

export function Stop({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <li className="group grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4">
      <div
        aria-hidden
        className="flex flex-col items-center"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-mint bg-mint-tint text-ink">
          <Icon className="size-5" />
        </span>
        <span className="w-0.5 flex-1 bg-mint group-last:bg-linear-to-b group-last:from-mint group-last:to-transparent" />
      </div>
      <section
        aria-labelledby={id}
        className="mb-5 flex min-w-0 flex-col gap-4 rounded-soft border border-line bg-paper p-5 shadow-soft group-last:mb-0"
      >
        <header className="flex flex-col gap-1.25">
          <h2
            id={id}
            className="eyebrow"
          >
            {title}
          </h2>
          {hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
        </header>
        {children}
      </section>
    </li>
  );
}
