"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { AddressSearch } from "@/components/address-search";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { formatDistance, type Locale } from "@/lib/format";
import { distanceMeters, type Coords } from "@/lib/geo";
import { haptics } from "@/lib/native/haptics";
import { cn, fill } from "@/lib/utils";
import { useSaveStatus } from "../../../_components/save-status";
import type { MapPin } from "../../_components/chapter-map";
import {
  resolveChapterPlace,
  suggestChapterPlaces,
  updateChapterAction,
} from "../../actions";
import type { ChapterLabels } from "./chapter-editor";

const ChapterMap = dynamic(() => import("../../_components/chapter-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 60;

type Place = {
  coords: Coords;
  address: string | null;
  city: string;
  radiusKm: number;
};

const keyOf = (place: Place) =>
  `${place.coords.lat}|${place.coords.lng}|${place.address}|${place.city}|${place.radiusKm}`;

/**
 * Where the chapter sits and how far it rides. The address box above the map
 * holds the address on record; typing a new one searches Mapbox, and picking a
 * result writes address, town and coordinates in one save — one history line,
 * one Undo. The pin itself only shows.
 */
export function ChapterLocation({
  id,
  server,
  others,
  mapEnabled,
  language,
  notation,
  labels,
}: {
  id: string;
  server: Place;
  others: MapPin[];
  mapEnabled: boolean;
  language: string;
  notation: Locale;
  labels: ChapterLabels;
}) {
  const router = useRouter();
  const report = useSaveStatus();
  const sessionToken = useMemo(() => crypto.randomUUID(), []);
  // ponytail: the optimistic value holds only until the server moves off the
  // value it replaced — same trick as InlineField, including its one wart,
  // that an Undo shows the server value for the length of one refresh.
  const [override, setOverride] = useState<{ from: string; to: Place } | null>(
    null,
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);

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

    if (!result.ok) {
      setOverride(null);
      report("failed");
      haptics.error();
      toast.error(
        labels.field.errors[result.error] ?? labels.field.errors.generic,
      );
      return;
    }

    report("saved");
    haptics.success();
    toast.success(undoable ? labels.field.saved : labels.field.undone, {
      action: undoable
        ? {
            label: labels.field.undo,
            onClick: () => void persist(previous, next, false),
          }
        : undefined,
    });
    router.refresh();
  };

  const pick = async (mapboxId: string) => {
    setResolving(true);
    const found = await resolveChapterPlace({ mapboxId, sessionToken });
    setResolving(false);
    if (!found) {
      haptics.error();
      toast.error(labels.field.errors.generic);
      return;
    }
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

  const overlap = others
    .map((pin) => ({ pin, metres: distanceMeters(place.coords, pin.coords) }))
    .filter(({ pin, metres }) => metres < (radiusKm + pin.radiusKm) * 1000)
    .sort((a, b) => a.metres - b.metres)[0];

  return (
    <section className="grid gap-4 border-t border-line pt-6">
      <h2 className="text-base font-medium">{labels.location}</h2>

      <div
        aria-busy={resolving}
        className={cn(resolving && "pointer-events-none opacity-60")}
      >
        <AddressSearch
          key={place.address ?? ""}
          defaultQuery={place.address ?? ""}
          search={(query) =>
            suggestChapterPlaces({ query, sessionToken, language })
          }
          strings={labels.address}
          onPick={(suggestion) => void pick(suggestion.id)}
          inputClassName="h-11 rounded-(--r-card)"
        />
      </div>

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
            {fill(labels.radiusValue, {
              distance: formatDistance(radiusKm * 1000, notation),
            })}
          </span>
        </div>
        <Slider
          min={MIN_RADIUS_KM}
          max={MAX_RADIUS_KM}
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
            {fill(labels.overlap, {
              name: overlap.pin.name,
              distance: formatDistance(overlap.metres, notation),
            })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
