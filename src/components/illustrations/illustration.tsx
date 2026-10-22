import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const STROKE = 2.5;

export type IllustrationProps = {
  className?: string;
  title?: string;
};

export function Illustration({
  viewBox,
  className,
  title,
  children,
}: IllustrationProps & { viewBox: string; children: ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      className={cn("block h-auto text-ink", className)}
    >
      {children}
    </svg>
  );
}
