import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TimelineTileKind = "pickup" | "arrive" | "return";

const GLYPH: Record<TimelineTileKind, ReactNode> = {
  pickup: (
    <>
      <path d="M3.5 20.5H20.5" />
      <rect
        x={6.5}
        y={3.5}
        width={11}
        height={17}
        rx={1.5}
        className="fill-mint"
      />
      <path d="M9.5 7.5H14.5" />
      <circle
        cx={14.75}
        cy={13}
        r={1}
        stroke="none"
        className="fill-ink"
      />
    </>
  ),
  arrive: (
    <>
      <path
        d="M7 4.5H18L15.5 8.5L18 12.5H7Z"
        className="fill-red"
      />
      <path d="M7 3V21M4.5 21H9.5" />
    </>
  ),
  return: (
    <>
      <path d="M14 20.5H16a4.75 4.75 0 0 0 0-9.5H4.5" />
      <path d="M8.5 7L4.5 11L8.5 15" />
      <circle
        cx={11}
        cy={20.5}
        r={1.25}
        stroke="none"
        className="fill-mint-deep"
      />
    </>
  ),
};

export function TimelineTile({
  kind,
  className,
}: {
  kind: TimelineTileKind;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint-tint text-ink",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        className="size-6"
      >
        {GLYPH[kind]}
      </svg>
    </span>
  );
}
