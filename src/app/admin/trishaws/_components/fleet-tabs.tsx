"use client";

import { useSearchParams } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";
import { AdminTabs, type AdminTab } from "../../_components/admin-tabs";
import { viewerScope, type AdminViewer } from "../../_components/viewer-scope";

export type FleetTab = "trishaws" | "models" | "timeline";

type FleetTabLabels = Dictionary["fleet"]["trishaws"]["tabs"];

const fleetTabs = (labels: FleetTabLabels): AdminTab[] => [
  { key: "trishaws", href: "/admin/trishaws", label: labels.trishaws },
  { key: "models", href: "/admin/trishaws/types", label: labels.models },
  { key: "timeline", href: "/admin/trishaws/timeline", label: labels.timeline },
];

export function FleetTabs({
  viewer,
  labels,
  current,
}: {
  viewer: AdminViewer;
  labels: FleetTabLabels;
  current: FleetTab;
}) {
  const { scopeQuery } = viewerScope(useSearchParams(), viewer);

  return (
    <AdminTabs
      tabs={fleetTabs(labels)}
      current={current}
      scopeQuery={scopeQuery}
      label={labels.label}
    />
  );
}
