import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AdminSearchParams } from "../active-scope";
import { hrefWith } from "./href-with";

export const HISTORY_PAGE = 10;

export function historyShown(query: AdminSearchParams) {
  const asked = Number(
    Array.isArray(query.history) ? query.history[0] : query.history,
  );
  return Number.isFinite(asked)
    ? Math.min(Math.max(Math.floor(asked), HISTORY_PAGE), 500)
    : HISTORY_PAGE;
}

export function HistoryMore({
  pathname,
  query,
  shown,
  total,
  label,
}: {
  pathname: string;
  query: AdminSearchParams;
  shown: number;
  total: number;
  label: string;
}) {
  if (total <= shown) return null;
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="w-fit border-line"
    >
      <Link
        href={hrefWith(pathname, query, {
          history: String(shown + HISTORY_PAGE),
        })}
        scroll={false}
      >
        {label}
      </Link>
    </Button>
  );
}
