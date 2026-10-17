import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      transitionTypes={["pop"]}
      className="-ml-1 flex w-fit items-center gap-1 rounded-full py-1 pr-2 text-sm text-ink-soft transition-colors hover:text-ink motion-reduce:transition-none"
    >
      <ChevronLeft
        className="size-4"
        aria-hidden
      />
      {label}
    </Link>
  );
}
