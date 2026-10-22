import type { ReactNode } from "react";
import Link from "next/link";
import {
  TimelineTile,
  type TimelineTileKind,
} from "@/components/illustrations";

export function TimelineStop({
  kind,
  title,
  href,
  children,
}: {
  kind: TimelineTileKind;
  title: string;
  href?: string;
  children?: ReactNode;
}) {
  return (
    <li className="group relative flex gap-3 pb-5 last:pb-0">
      <span
        aria-hidden
        className="absolute top-11 bottom-1 left-5 w-px bg-line group-last:hidden"
      />
      <TimelineTile kind={kind} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-2">
        {href ? (
          <Link
            href={href}
            transitionTypes={["push"]}
            className="w-fit font-semibold underline underline-offset-4 hover:text-ink-soft"
          >
            {title}
          </Link>
        ) : (
          <p className="font-semibold">{title}</p>
        )}
        {children}
      </div>
    </li>
  );
}
