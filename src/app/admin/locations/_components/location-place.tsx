"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Dictionary } from "@/lib/i18n";
import { PlaceSearch } from "../../_components/place-search";

const PlaceMap = dynamic(
  () => import("../../chapters/_components/chapter-map"),
  {
    ssr: false,
    loading: () => <Skeleton className="size-full rounded-none" />,
  },
);

export type Place = {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

const PIN_RADIUS_KM = 0.03;

export function LocationPlace({
  value,
  onChange,
  mapEnabled,
  language,
  strings,
  failed,
  readOnly = false,
}: {
  value: Place;
  onChange: (next: Place) => void;
  mapEnabled: boolean;
  language: string;
  strings: Pick<Dictionary["fleet"]["locations"], "address" | "map">;
  failed: string;
  readOnly?: boolean;
}) {
  const { latitude, longitude } = value;
  const center = useMemo(
    () =>
      latitude !== null && longitude !== null
        ? { lat: latitude, lng: longitude }
        : null,
    [latitude, longitude],
  );

  return (
    <div className="grid gap-3">
      {readOnly ? null : (
        <PlaceSearch
          address={value.address}
          language={language}
          strings={strings.address}
          failed={failed}
          onPlace={(found) =>
            onChange({
              address: found.address,
              latitude: found.coords.lat,
              longitude: found.coords.lng,
            })
          }
        />
      )}
      {center && mapEnabled ? (
        <div className="h-56 overflow-hidden rounded-(--r-tile) border border-line md:h-64">
          <PlaceMap
            center={center}
            radiusKm={PIN_RADIUS_KM}
            others={[]}
            label={strings.map.label}
            onMove={
              readOnly
                ? undefined
                : (coords) =>
                    onChange({
                      ...value,
                      latitude: coords.lat,
                      longitude: coords.lng,
                    })
            }
          />
        </div>
      ) : center ? (
        <p className="rounded-(--r-tile) bg-canvas-deep p-4 text-center text-2sm text-ink-soft">
          {strings.map.unavailable}
        </p>
      ) : null}
    </div>
  );
}
