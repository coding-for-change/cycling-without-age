"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { List, Map as MapIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hrefWith } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { viewerScope, type AdminViewer } from "../../_components/viewer-scope";

const TAB = "flex min-h-9 items-center gap-1.5 rounded-full px-3 text-2sm";
const ACTIVE_TAB = "bg-canvas text-ink shadow-soft";

export function ChaptersActions({
  viewer,
  strings,
}: {
  viewer: AdminViewer;
  strings: { list: string; map: string; new: string };
}) {
  const params = useSearchParams();
  const { scopeQuery } = viewerScope(params, viewer);
  const view = params.get("view") === "map" ? "map" : "list";
  const href = (extra: Record<string, string>) =>
    hrefWith("/admin/chapters", scopeQuery, extra);
  const keepView: Record<string, string> =
    view === "map" ? { view: "map" } : {};

  return (
    <>
      <div className="flex items-center gap-1 rounded-full bg-grey-tint p-1">
        <Link
          href={href({})}
          aria-current={view === "list" ? "page" : undefined}
          className={cn(TAB, view === "list" ? ACTIVE_TAB : "text-ink-soft")}
        >
          <List
            className="size-4"
            aria-hidden
          />
          {strings.list}
        </Link>
        <Link
          href={href({ view: "map" })}
          aria-current={view === "map" ? "page" : undefined}
          className={cn(TAB, view === "map" ? ACTIVE_TAB : "text-ink-soft")}
        >
          <MapIcon
            className="size-4"
            aria-hidden
          />
          {strings.map}
        </Link>
      </div>
      <Button
        asChild
        variant="brand"
        className="min-h-11"
      >
        <Link href={href({ ...keepView, new: "1" })}>
          <Plus aria-hidden />
          {strings.new}
        </Link>
      </Button>
    </>
  );
}
