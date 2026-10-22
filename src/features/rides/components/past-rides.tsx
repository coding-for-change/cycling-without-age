import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function PastRides({
  show,
  hide,
  children,
}: {
  show: string;
  hide: string;
  children: ReactNode;
}) {
  return (
    <details className="group flex flex-col">
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.25 rounded-md text-sm font-medium text-ink-soft outline-none select-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ink [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{show}</span>
        <span className="hidden group-open:inline">{hide}</span>
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}
