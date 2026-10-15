"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hrefWith } from "@/lib/search-params";
import { viewerScope, type AdminViewer } from "../../_components/viewer-scope";

export function CountriesActions({
  viewer,
  label,
}: {
  viewer: AdminViewer;
  label: string;
}) {
  const { scopeQuery } = viewerScope(useSearchParams(), viewer);

  return (
    <Button
      asChild
      variant="brand"
      className="min-h-11"
    >
      <Link href={hrefWith("/admin/countries", scopeQuery, { new: "1" })}>
        <Plus aria-hidden />
        {label}
      </Link>
    </Button>
  );
}
