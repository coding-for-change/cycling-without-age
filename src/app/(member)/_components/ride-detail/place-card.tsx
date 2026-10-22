import { ChevronRight, MapPin } from "lucide-react";
import {
  OpenInMapsSheet,
  type MapPlace,
  type OpenInMapsStrings,
} from "@/features/rides/components/open-in-maps-sheet";
import { StaticMap } from "@/features/rides/components/static-map";
import type { Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";

export function PlaceCard({
  place,
  mapOf,
  strings,
  words,
}: {
  place: MapPlace;
  mapOf: string;
  strings: OpenInMapsStrings;
  words: Locale;
}) {
  const name = place.name?.trim() || place.address?.trim() || null;
  if (!name) return null;

  return (
    <OpenInMapsSheet
      place={place}
      strings={strings}
      words={words}
    >
      <span className="flex flex-col gap-3">
        <StaticMap
          lat={place.latitude}
          lng={place.longitude}
          label={formatMessage(mapOf, { place: name }, words)}
        />
        <PlaceRow
          name={name}
          address={
            place.name?.trim() && place.address?.trim() ? place.address : null
          }
        />
      </span>
    </OpenInMapsSheet>
  );
}

export function PlaceRow({
  name,
  address,
}: {
  name: string;
  address: string | null;
}) {
  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint-tint text-ink"
      >
        <MapPin className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{name}</span>
        {address ? (
          <span className="truncate text-2sm text-ink-soft">{address}</span>
        ) : null}
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-ink-faint"
      />
    </span>
  );
}
