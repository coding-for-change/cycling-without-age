"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";
import { hrefWith } from "@/lib/search-params";
import { AdminTabs } from "../../_components/admin-tabs";
import { viewerScope, type AdminViewer } from "../../_components/viewer-scope";
import { locationTabs } from "../pool-countries";

type LocationStrings = Dictionary["fleet"]["locations"];

export function LocationsActions({
  viewer,
  strings,
}: {
  viewer: AdminViewer;
  strings: LocationStrings["actions"];
}) {
  const { scopeQuery, chapterIds } = viewerScope(useSearchParams(), viewer);
  if (chapterIds.length === 0) return null;

  return (
    <>
      <Button
        asChild
        variant="outline"
        className="min-h-11 border-line"
      >
        <Link href={hrefWith("/admin/locations", scopeQuery, { join: "1" })}>
          <KeyRound aria-hidden />
          {strings.join}
        </Link>
      </Button>
      <Button
        asChild
        variant="brand"
        className="min-h-11"
      >
        <Link
          href={hrefWith("/admin/locations", scopeQuery, { new: "location" })}
        >
          <Plus aria-hidden />
          {strings.newLocation}
        </Link>
      </Button>
    </>
  );
}

export function LocationsTabs({
  viewer,
  labels,
  poolsBadge,
}: {
  viewer: AdminViewer;
  labels: LocationStrings["tabs"];
  poolsBadge: ReactNode;
}) {
  const { scopeQuery, countryIds } = viewerScope(useSearchParams(), viewer);
  if (countryIds.length === 0) return null;

  return (
    <AdminTabs
      tabs={locationTabs(labels, 0).map((tab) =>
        tab.key === "pools" ? { ...tab, badge: poolsBadge } : tab,
      )}
      current="locations"
      scopeQuery={scopeQuery}
      label={labels.label}
    />
  );
}
