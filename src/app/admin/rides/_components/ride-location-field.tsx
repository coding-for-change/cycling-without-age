"use client";

import { MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlaceValue, type Place } from "@/features/rides/components/place";
import { placeFromResolved } from "@/features/rides/components/place";
import type { RideLocationKind } from "@/features/ride-locations/schemas";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";
import { PlaceSearch } from "../../_components/place-search";

export type RideLocationChoice = {
  id: string;
  chapterId: string;
  kind: RideLocationKind;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  defaultTrishawCount: number;
  defaultPilotCount: number;
  defaultMinutes: number | null;
};

export type RideLocationFieldStrings = {
  picker: Dictionary["admin"]["rideLocations"]["picker"];
  kinds: Dictionary["admin"]["rideLocations"]["kinds"];
  search: Parameters<typeof PlaceSearch>[0]["strings"];
  chapterLocation: string;
  clear: string;
};

export const placeOfLocation = (location: RideLocationChoice): Place | null =>
  location.latitude === null || location.longitude === null
    ? null
    : {
        name: location.name,
        address: location.address ?? location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      };

export function RideLocationField({
  locations,
  location,
  place,
  home,
  onLocation,
  onPlace,
  strings,
  language,
  failed,
}: {
  locations: RideLocationChoice[];
  location: RideLocationChoice | null;
  place: Place | null;
  home: Place | null;
  onLocation: (location: RideLocationChoice) => void;
  onPlace: (place: Place | null) => void;
  strings: RideLocationFieldStrings;
  language: Locale;
  failed: string;
}) {
  const picked = location
    ? { name: location.name, address: location.address }
    : place;

  if (picked)
    return (
      <div className="group flex min-h-9 items-center gap-3 rounded-lg px-2 py-1.5">
        <MapPin
          aria-hidden
          className="size-4 shrink-0 text-ink-soft"
        />
        <PlaceValue
          name={picked.name}
          address={picked.address}
          className="flex-1"
        />
        {location ? (
          <Badge className="shrink-0 bg-mint-tint font-normal text-ink">
            {strings.kinds[location.kind]}
          </Badge>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onPlace(null)}
          aria-label={formatMessage(
            strings.clear,
            { place: picked.name ?? "" },
            language,
          )}
          className="size-8 shrink-0 text-ink-soft"
        >
          <X aria-hidden />
        </Button>
      </div>
    );

  return (
    <div className="flex min-h-9 items-center gap-3 px-2 py-1">
      <MapPin
        aria-hidden
        className="size-4 shrink-0 text-ink-soft"
      />
      <div className="min-w-0 flex-1">
        <PlaceSearch
          address={null}
          language={language}
          strings={{
            ...strings.search,
            placeholder: strings.picker.placeholder,
          }}
          failed={failed}
          variant="popover"
          shortcuts={[
            ...locations.map((choice) => ({
              id: choice.id,
              name: choice.name,
              hint: choice.address
                ? formatMessage(
                    strings.picker.hint,
                    {
                      kind: strings.kinds[choice.kind],
                      address: choice.address,
                    },
                    language,
                  )
                : strings.kinds[choice.kind],
              keywords: `${choice.address ?? ""} ${strings.kinds[choice.kind]}`,
              icon: MapPin,
              onPick: () => onLocation(choice),
            })),
            ...(home
              ? [
                  {
                    id: "chapter",
                    name: home.name,
                    hint: strings.chapterLocation,
                    keywords: home.address,
                    onPick: () => onPlace(home),
                  },
                ]
              : []),
          ]}
          onPlace={(found) => onPlace(placeFromResolved(found))}
        />
      </div>
    </div>
  );
}
