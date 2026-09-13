"use client";

import { useRouter } from "next/navigation";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import type { Perspective } from "@/lib/access";
import type { AccountData } from "./types";

/**
 * The hats this person wears, as a segmented control. One hat means nothing to
 * switch, so the row is not rendered at all. Switching closes the surface first:
 * the shell it belongs to is the thing being left.
 */
export function PerspectiveRow({
  data,
  activePerspective,
  onOpenChange,
  className,
}: {
  data: AccountData;
  activePerspective?: Perspective;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  const router = useRouter();
  if (data.perspectives.length < 2) return null;

  return (
    <div className={cn("grid gap-2", className)}>
      <span className="text-2sm font-medium text-ink-soft">
        {data.strings.perspective.title}
      </span>
      <div
        role="radiogroup"
        aria-label={data.strings.perspective.title}
        className="flex flex-wrap items-stretch gap-1 rounded-(--r-tile) border border-line p-1"
      >
        {data.perspectives.map((option) => {
          const active = option.perspective === activePerspective;
          return (
            <button
              key={option.perspective}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                if (active) return;
                haptics.tap("medium");
                onOpenChange(false);
                router.push(option.href);
              }}
              className={cn(
                "min-h-11 grow basis-20 touch-manipulation rounded-full px-3 text-2sm font-medium transition-colors motion-reduce:transition-none",
                active
                  ? "bg-mint-deep text-white"
                  : "text-ink-soft hover:bg-canvas-deep hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
