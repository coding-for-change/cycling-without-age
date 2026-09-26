"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { formatDistance, type Locale } from "@/lib/format";
import { nearestOverlap, type Coords } from "@/lib/geo";
import type { ResolvedPlace } from "@/lib/mapbox";
import { DetailSection } from "../../../_components/detail-page";
import { PlaceSearch } from "../../../_components/place-search";
import { CHAPTER_RADIUS_KM } from "@/features/chapters/schemas";
import { formatMessage } from "@/lib/i18n/format";
import { reportSave } from "@/components/action-feedback";
import { useSaveStatus } from "@/components/save-status";
import type { MapPin } from "../../_components/chapter-map";
import { updateChapterAction } from "../../actions";
import type { ChapterLabels } from "./chapter-editor";
import { ChapterTimeZone } from "./chapter-time-zone";

const ChapterMap = dynamic(() => import("../../_components/chapter-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

type Place = {
  coords: Coords;
  address: string | null;
  city: string;
  radiusKm: number;
};

const keyOf = (place: Place) =>
  `${place.coords.lat}|${place.coords.lng}|${place.address}|${place.city}|${place.radiusKm}`;

export function ChapterLocation({
  id,
  server,
  others,
  mapEnabled,
  language,
  notation,
  labels,
  timeZone,
  zones,
}: {
  id: string;
  server: Place;
  timeZone: string;
  zones: readonly string[];
  others: MapPin[];
  mapEnabled: boolean;
  language: string;
  notation: Locale;
  labels: ChapterLabels;
}) {
  const report = useSaveStatus();
  // ponytail: the optimistic value holds only until the server moves off the
  // value it replaced — same trick as InlineField, including its one wart,
  // that an Undo shows the server value for the length of one refresh.
  const [override, setOverride] = useState<{ from: string; to: Place } | null>(
    null,
  );
  const [dragging, setDragging] = useState<number | null>(null);

  const key = keyOf(server);
  const place = override && override.from === key ? override.to : server;
  const radiusKm = dragging ?? place.radiusKm;

  const persist = async (next: Place, previous: Place, undoable: boolean) => {
    setOverride({ from: key, to: next });
    report("saving");
    const result = await updateChapterAction(id, {
      latitude: next.coords.lat,
      longitude: next.coords.lng,
      address: next.address,
      city: next.city,
      serviceRadiusKm: next.radiusKm,
    });

    const ok = reportSave(result, {
      report,
      labels: labels.field,
      undo: undoable ? () => void persist(previous, next, false) : undefined,
    });
    if (!ok) setOverride(null);
  };

  const pick = async (found: ResolvedPlace) => {
    const previous = place;
    await persist(
      {
        coords: found.coords,
        address: found.address,
        city: found.city ?? previous.city,
        radiusKm: previous.radiusKm,
      },
      previous,
      true,
    );
  };

  const overlap = nearestOverlap(place.coords, radiusKm, others);

  return (
    <DetailSection title={labels.location}>
      <PlaceSearch
        address={place.address}
        language={language}
        strings={labels.address}
        failed={labels.field.errors.generic}
        onPlace={pick}
      />

      {mapEnabled ? (
        <div className="h-72 overflow-hidden rounded-(--r-tile) border border-line md:h-80">
          <ChapterMap
            center={place.coords}
            radiusKm={radiusKm}
            others={others}
            label={labels.map.label}
          />
        </div>
      ) : (
        <p className="grid h-72 place-items-center rounded-(--r-tile) bg-canvas-deep p-6 text-center text-2sm text-ink-soft md:h-80">
          {labels.map.unavailable}
        </p>
      )}

      <div className="grid gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-2sm font-medium">{labels.radius}</span>
          <span className="text-2sm tabular-nums text-ink-soft">
            {formatMessage(
              labels.radiusValue,
              { distance: formatDistance(radiusKm * 1000, notation) },
              language,
            )}
          </span>
        </div>
        <Slider
          min={CHAPTER_RADIUS_KM.min}
          max={CHAPTER_RADIUS_KM.sliderMax}
          step={1}
          value={[radiusKm]}
          aria-label={labels.radius}
          className="py-2"
          onValueChange={([next]) => setDragging(next)}
          onValueCommit={([next]) => {
            setDragging(null);
            if (next === place.radiusKm) return;
            void persist({ ...place, radiusKm: next }, place, true);
          }}
        />
        {overlap ? (
          <p className="flex items-start gap-2 text-2sm text-ink-soft">
            <CircleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
            />
            {formatMessage(
              labels.overlap,
              {
                name: overlap.pin.name,
                distance: formatDistance(overlap.metres, notation),
              },
              language,
            )}
          </p>
        ) : null}

        <ChapterTimeZone
          id={id}
          value={timeZone}
          zones={zones}
          labels={{
            timeZone: labels.timeZone,
            timeZoneHint: labels.timeZoneHint,
            field: labels.field,
          }}
        />
      </div>
    </DetailSection>
  );
}
