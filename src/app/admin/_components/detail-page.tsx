import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The way back out of a detail page, above its header. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-fit items-center gap-2 text-2sm text-ink-soft hover:text-ink"
    >
      <ArrowLeft
        aria-hidden
        className="size-4"
      />
      {label}
    </Link>
  );
}

/**
 * One block of a detail page's main column. Linear separates these with a rule
 * and a heading rather than cards, so that pairing lives here.
 */
export function DetailSection({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-4 border-t border-line pt-6", className)}>
      {title ? <h2 className="text-base font-medium">{title}</h2> : null}
      {children}
    </section>
  );
}
