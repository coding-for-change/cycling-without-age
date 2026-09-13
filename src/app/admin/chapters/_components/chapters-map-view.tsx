"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { MapUnavailable } from "@/components/map-unavailable";
import { X } from "lucide-react";
import { AdminEmpty } from "../../_components/admin-empty";
import { ICONS } from "../../_components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistance, type Locale } from "@/lib/format";
import { fill } from "@/lib/utils";
import { ChapterLogo } from "./chapter-logo";
import type { MapPin } from "./chapter-map";

const ChapterMap = dynamic(() => import("./chapter-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export type ChapterPin = MapPin & { logo: string | null };

export type ChaptersMapStrings = {
  empty: string;
  mapLabel: string;
  mapUnavailable: string;
  open: string;
  close: string;
  radiusValue: string;
};

export function ChaptersMapView({
  pins,
  notation,
  scopeQuery,
  strings,
}: {
  pins: ChapterPin[];
  notation: Locale;
  scopeQuery: string;
  strings: ChaptersMapStrings;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pins.find((pin) => pin.id === selectedId) ?? null;

  if (pins.length === 0)
    return <AdminEmpty icon={ICONS.chapters}>{strings.empty}</AdminEmpty>;

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
    return (
      <div className="grid h-[70svh] place-items-center rounded-(--r-tile) bg-canvas-deep p-6 text-center">
        <MapUnavailable label={strings.mapUnavailable} />
      </div>
    );

  return (
    <div className="relative h-[80svh] overflow-hidden rounded-(--r-tile) border border-line">
      <ChapterMap
        center={null}
        radiusKm={0}
        others={pins}
        selectedId={selectedId}
        onSelect={setSelectedId}
        label={strings.mapLabel}
      />

      {selected ? (
        <div className="absolute bottom-4 left-4 z-10 w-[calc(100%-2rem)] max-w-80 rounded-(--r-card) bg-canvas p-4 shadow-lift">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={strings.close}
            onClick={() => setSelectedId(null)}
            className="absolute top-2 right-2 size-8"
          >
            <X aria-hidden />
          </Button>

          <div className="flex items-start gap-3 pr-8">
            <ChapterLogo
              logo={selected.logo}
              name={selected.name}
              className="size-11"
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{selected.name}</p>
              <p className="truncate text-2sm text-ink-soft">{selected.city}</p>
            </div>
          </div>

          <p className="mt-3 text-2sm text-ink-soft">
            {fill(strings.radiusValue, {
              distance: formatDistance(selected.radiusKm * 1000, notation),
            })}
          </p>

          <Button
            asChild
            className="mt-3 min-h-11 w-full"
          >
            <Link href={`/admin/chapters/${selected.id}${scopeQuery}`}>
              {strings.open}
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
