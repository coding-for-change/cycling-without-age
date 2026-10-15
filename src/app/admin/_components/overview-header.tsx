"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { hrefWith } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { viewerScope, type AdminViewer } from "./viewer-scope";

export function OpenReportsLink({
  viewer,
  label,
}: {
  viewer: AdminViewer;
  label: string;
}) {
  const { scopeQuery } = viewerScope(useSearchParams(), viewer);

  return (
    <Link
      href={hrefWith("/admin/reports", scopeQuery, {})}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "gap-1.5 text-2sm",
      )}
    >
      {label}
      <ArrowRight
        aria-hidden
        className="size-4"
      />
    </Link>
  );
}
