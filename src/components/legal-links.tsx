import Link from "next/link";
import type { LegalLink } from "@/lib/legal";
import { cn } from "@/lib/utils";

const LINK_CLASS =
  "rounded-sm underline-offset-2 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink motion-reduce:transition-none";

const isExternal = (href: string) => /^https?:\/\//.test(href);

export function LegalLinks({
  label,
  links,
  className,
}: {
  label: string;
  links: LegalLink[];
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-soft",
        className,
      )}
    >
      {links.map((link) =>
        isExternal(link.href) ? (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            {link.label}
          </a>
        ) : (
          <Link
            key={link.href}
            href={link.href}
            className={LINK_CLASS}
          >
            {link.label}
          </Link>
        ),
      )}
    </nav>
  );
}
