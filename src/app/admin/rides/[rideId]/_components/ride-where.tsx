"use client";

import { Suspense, use, useMemo, useState, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOptimisticSave } from "@/components/use-optimistic-save";
import { updateRideAction } from "@/features/rides/actions";
import {
  coordsOf,
  placeFromResolved,
  PlaceValue,
  RouteSummary,
} from "@/features/rides/components/place";
import { LazyRideMap } from "@/features/rides/components/ride-map-lazy";
import type { Locale as Notation } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";
import type { Route } from "@/lib/mapbox";
import { cn } from "@/lib/utils";
import { PlaceSearch } from "../../../_components/place-search";
import { PROPERTY_BUTTON } from "../../../_components/properties";
import { SidePanel } from "../../../_components/side-panel";
import type { RideEditorLabels } from "./ride-editor";

export type Place = {
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

const samePlace = (a: Place, b: Place) =>
  a.latitude === b.latitude && a.longitude === b.longitude;

function usePlace(
  rideId: string,
  kind: "location" | "destination",
  value: Place,
  labels: RideEditorLabels,
) {
  const { name, address, latitude, longitude } = value;
  const server = useMemo<Place>(
    () => ({ name, address, latitude, longitude }),
    [name, address, latitude, longitude],
  );
  const save = useOptimisticSave(
    server,
    (next) =>
      updateRideAction(
        rideId,
        kind === "location"
          ? {
              locationName: next.name,
              locationAddress: next.address,
              latitude: next.latitude,
              longitude: next.longitude,
            }
          : {
              destinationName: next.name,
              destinationAddress: next.address,
              destinationLatitude: next.latitude,
              destinationLongitude: next.longitude,
            },
      ),
    labels.field,
  );
  return { server, ...save };
}

export function RideWhere({
  rideId,
  location,
  destination,
  home,
  functional,
  route,
  editable,
  language,
  notation,
  labels,
}: {
  rideId: string;
  location: Place;
  destination: Place;
  home: Place | null;
  functional: boolean;
  route: Promise<Route | null> | null;
  editable: boolean;
  language: Locale;
  notation: Notation;
  labels: RideEditorLabels;
}) {
  const { detail } = labels;
  const pickup = usePlace(rideId, "location", location, labels);
  const target = usePlace(rideId, "destination", destination, labels);
  const pickupAt = coordsOf(pickup.shown);
  const targetAt = functional ? coordsOf(target.shown) : null;
  const routeCurrent =
    functional &&
    route !== null &&
    samePlace(pickup.shown, pickup.server) &&
    samePlace(target.shown, target.server);

  const map = (path: [number, number][] | null) => (
    <LazyRideMap
      pickup={pickupAt}
      destination={targetAt}
      route={path}
      label={detail.map}
      unavailable={detail.mapUnavailable}
      className="h-35"
    />
  );

  return (
    <SidePanel title={detail.where}>
      <PlaceField
        label={detail.pickup}
        value={pickup.shown}
        home={home}
        editable={editable}
        language={language}
        labels={labels}
        onPlace={(next) => pickup.persist(next, pickup.shown)}
      />
      {functional ? (
        <PlaceField
          label={detail.destination}
          value={target.shown}
          home={home}
          editable={editable}
          language={language}
          labels={labels}
          onPlace={(next) => target.persist(next, target.shown)}
        />
      ) : null}
      {pickupAt || targetAt ? (
        routeCurrent && route ? (
          <Suspense fallback={map(null)}>
            <RouteView
              route={route}
              render={map}
              language={language}
              notation={notation}
              eta={detail.eta}
            />
          </Suspense>
        ) : (
          map(null)
        )
      ) : null}
    </SidePanel>
  );
}

function RouteView({
  route,
  render,
  language,
  notation,
  eta,
}: {
  route: Promise<Route | null>;
  render: (path: [number, number][] | null) => ReactNode;
  language: Locale;
  notation: Notation;
  eta: string;
}) {
  const found = use(route);
  return (
    <div className="grid gap-1.25">
      {render(found?.path ?? null)}
      <RouteSummary
        route={found}
        template={eta}
        language={language}
        notation={notation}
        className="gap-1.25 text-xs [&_svg]:size-3.5"
      />
    </div>
  );
}

function PlaceField({
  label,
  value,
  home,
  editable,
  language,
  labels,
  onPlace,
}: {
  label: string;
  value: Place;
  home: Place | null;
  editable: boolean;
  language: Locale;
  labels: RideEditorLabels;
  onPlace: (next: Place) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const { detail } = labels;
  const named = value.name && value.name !== value.address ? value.name : null;
  const primary = named ?? value.address;

  return (
    <div className="grid gap-1.25">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {editable ? (
        <Popover
          open={open}
          onOpenChange={setOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label={`${label}: ${primary ?? detail.setPlace}. ${detail.changePlace}`}
              title={value.address ?? undefined}
              className={cn(PROPERTY_BUTTON, primary && "text-ink")}
            >
              <MapPin
                aria-hidden
                className="text-ink-soft"
              />
              <span className="min-w-0 truncate">
                {primary ?? detail.setPlace}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-80 rounded-xl border-line p-2"
          >
            <PlaceSearch
              variant="popover"
              autoFocus
              address={value.address}
              language={language}
              strings={detail.place}
              failed={labels.errors.generic}
              shortcuts={
                home?.name
                  ? [
                      {
                        id: "chapter",
                        name: home.name,
                        hint: detail.chapterLocation,
                        keywords: home.address ?? undefined,
                        onPick: () => {
                          setOpen(false);
                          void onPlace(home);
                        },
                      },
                    ]
                  : undefined
              }
              onPlace={async (found) => {
                setOpen(false);
                await onPlace(placeFromResolved(found));
              }}
            />
          </PopoverContent>
        </Popover>
      ) : null}
      <PlaceValue
        name={editable ? null : (primary ?? detail.noPlace)}
        address={named ? value.address : null}
        muted={!primary}
      />
    </div>
  );
}
