"use client";

import { useRouter } from "next/navigation";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import type { Perspective } from "@/lib/access";
import type { AccountData } from "./types";

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
    <div className={cn("grid min-w-0 gap-1.25", className)}>
      <span className="px-4 text-2sm font-medium text-ink-soft">
        {data.strings.perspective.title}
      </span>
      <div
        role="radiogroup"
        aria-label={data.strings.perspective.title}
        className="flex min-w-0 items-stretch gap-0.5 rounded-(--r-card) bg-canvas-deeper p-0.5"
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
                "min-h-10 min-w-0 flex-1 touch-manipulation truncate rounded-lg px-3 text-2sm font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink motion-reduce:transition-none",
                active
                  ? "bg-canvas text-ink shadow-soft"
                  : "text-ink-soft hover:text-ink",
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
