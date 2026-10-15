"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyToolbar } from "../../_components/sticky-toolbar";
import { viewerScope, type AdminViewer } from "../../_components/viewer-scope";
import { newRideHref, ridesView, ridesViewHrefs } from "../rides-view";
import { RideBodySkeleton } from "./rides-skeleton";
import { RidesViewSwitch } from "./rides-view-switch";

type ToolbarStrings = {
  toolbar: string;
  view: string;
  calendar: string;
  list: string;
  newRide: string;
};

export function RidesToolbar({
  viewer,
  strings,
  weekSwitcher,
}: {
  viewer: AdminViewer;
  strings: ToolbarStrings;
  weekSwitcher: ReactNode;
}) {
  const params = useSearchParams();
  const { chapterIds } = viewerScope(params, viewer);
  const view = ridesView(params.get("view"));

  return (
    <StickyToolbar label={strings.toolbar}>
      <div className="flex h-8 items-center gap-3">
        <RidesViewSwitch
          value={view}
          hrefs={ridesViewHrefs(params)}
          strings={{
            label: strings.view,
            calendar: strings.calendar,
            list: strings.list,
          }}
        />
        {view === "calendar" ? (
          <div className="min-w-0 max-lg:[&_p]:hidden">{weekSwitcher}</div>
        ) : null}
        {chapterIds.length > 0 ? (
          <Button
            asChild
            variant="brand"
            size="sm"
            className="ml-auto h-8"
          >
            <Link
              href={newRideHref(params)}
              aria-label={strings.newRide}
            >
              <Plus aria-hidden />
              <span className="max-sm:hidden">{strings.newRide}</span>
            </Link>
          </Button>
        ) : null}
      </div>
    </StickyToolbar>
  );
}

export function RidesBodyFallback() {
  return <RideBodySkeleton view={ridesView(useSearchParams().get("view"))} />;
}
