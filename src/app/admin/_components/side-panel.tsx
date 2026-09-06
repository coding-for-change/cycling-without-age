import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One box in a detail page's properties column — Linear's "Properties ▾" cards.
 * Native details/summary: opens and closes without a client component, so the
 * body can hold Server Components. `action` sits in the header row but outside
 * the summary, so clicking it never toggles the box.
 */
// ponytail: open state is per page load; persist it per `title` in localStorage
// if people start closing the same panel on every visit.
export function SidePanel({
  title,
  action,
  defaultOpen = true,
  className,
  children,
}: {
  title: string;
  action?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn("group relative rounded-xl bg-canvas-deep", className)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-xl px-4 py-3 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <h2 className="text-2sm font-medium">{title}</h2>
        <ChevronRight
          aria-hidden
          className="size-3.5 text-ink-soft transition-transform group-open:rotate-90"
        />
      </summary>
      {action ? <div className="absolute top-2 right-2">{action}</div> : null}
      <div className="grid gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}
