"use client";

import dynamic from "next/dynamic";
import { MapUnavailable } from "@/components/map-unavailable";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/format";
import { MAP_ENABLED } from "@/lib/mapbox-map";
import type { MapChapter } from "./activity-map-canvas";
import { ReportCard } from "./report-card";

export type { MapChapter };
export type MapStrings = Dictionary["admin"]["reports"]["map"];

const ActivityMapCanvas = dynamic(() => import("./activity-map-canvas"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export function ActivityMap({
  chapters,
  activeChapterId,
  notation,
  strings,
}: {
  chapters: MapChapter[];
  activeChapterId: string | null;
  notation: Locale;
  strings: MapStrings;
}) {
  return (
    <ReportCard
      className="overflow-hidden"
      title={strings.title}
      action={<span className="text-xs text-ink-soft">{strings.hint}</span>}
    >
      <div className="relative -mx-4 -mb-4 h-80 overflow-hidden border-t border-line md:-mx-5 md:-mb-5 md:h-96 lg:h-auto lg:min-h-96 lg:flex-1">
        {MAP_ENABLED ? (
          <ActivityMapCanvas
            chapters={chapters}
            activeChapterId={activeChapterId}
            notation={notation}
            label={strings.label}
          />
        ) : (
          <div className="grid size-full place-items-center bg-canvas-deep p-5 text-center">
            <MapUnavailable label={strings.unavailable} />
          </div>
        )}
      </div>
    </ReportCard>
  );
}
