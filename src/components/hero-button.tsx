import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mockup 2's signature call to action: a full-width pill with a round knob.
 * Red is the one action that matters (docs-internal/BRAND.md § Red); `deep`
 * steps it back to dark mint once something else on the screen leads.
 */
export function HeroButton({
  href,
  label,
  sub,
  icon: Icon,
  tone = "red",
  className,
}: {
  href: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "red" | "deep";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-16 w-full items-center gap-3 rounded-full py-2 pr-2 pl-6 text-left font-display text-lg font-bold text-white outline-none transition-[transform,background-color] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-98 motion-reduce:transition-none",
        tone === "red"
          ? "bg-red hover:bg-red-hover"
          : "bg-mint-deep hover:brightness-110",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        {label}
        {sub ? (
          <span className="block font-sans text-sm font-medium opacity-80">
            {sub}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/20"
      >
        <Icon className="size-5" />
      </span>
    </Link>
  );
}
