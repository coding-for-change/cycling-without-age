import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminTab = {
  key: string;
  href: string;
  label: string;
  count?: number;
};

export function AdminTabs({
  tabs,
  current,
  scopeQuery,
  label,
}: {
  tabs: AdminTab[];
  current: string;
  scopeQuery: string;
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className="-mt-3 flex gap-1 overflow-x-auto border-b border-line"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`${tab.href}${scopeQuery}`}
          aria-current={tab.key === current ? "page" : undefined}
          className={cn(
            "-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 text-2sm whitespace-nowrap transition-colors",
            tab.key === current
              ? "border-ink font-medium text-ink"
              : "border-transparent text-ink-soft hover:text-ink",
          )}
        >
          {tab.label}
          {tab.count ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-mint-deep px-1.5 text-xs font-medium text-white tabular-nums">
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
