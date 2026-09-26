import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, MapPin, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RowList({ children }: { children: ReactNode }) {
  return (
    <ul className="grid divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {children}
    </ul>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-2sm text-ink-soft">
      {children}
    </p>
  );
}

export function LocationRowLink({
  href,
  pool = false,
  name,
  badge,
  meta,
  count,
  action,
}: {
  href: string;
  pool?: boolean;
  name: string;
  badge?: string;
  meta: string;
  count: string;
  action?: ReactNode;
}) {
  const Icon = pool ? Warehouse : MapPin;
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas-deep">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint-tint text-ink"
      >
        <Icon className="size-4" />
      </span>
      <Link
        href={href}
        className="grid min-w-0 flex-1 gap-0.5 outline-none focus-visible:underline"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
          {badge ? (
            <Badge className="bg-mint font-normal text-ink">{badge}</Badge>
          ) : null}
        </span>
        <span className="truncate text-2sm text-ink-soft">{meta}</span>
      </Link>
      <span className="hidden text-2sm text-ink-soft tabular-nums sm:inline">
        {count}
      </span>
      {action ?? (
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-ink-faint"
        />
      )}
    </li>
  );
}
