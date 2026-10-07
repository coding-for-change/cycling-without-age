import type { LucideIcon } from "lucide-react";
import { ExternalLink, MapPin, MapPinned } from "lucide-react";
import type { PilotRideDetailRow } from "@/features/rides";
import { coordsOf } from "@/features/rides/components/place";
import { LazyRideMap } from "@/features/rides/components/ride-map-lazy";
import { googleMapsUrl } from "@/lib/geo";
import type { Dictionary } from "@/lib/i18n";

type Strings = Dictionary["pilot"]["rides"]["detail"];

type Stop = {
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function RideWhere({
  ride,
  strings,
  openInMaps,
}: {
  ride: Pick<
    PilotRideDetailRow,
    | "model"
    | "locationName"
    | "locationAddress"
    | "latitude"
    | "longitude"
    | "destinationName"
    | "destinationAddress"
    | "destinationLatitude"
    | "destinationLongitude"
  >;
  strings: Strings;
  openInMaps: string;
}) {
  const start: Stop = {
    name: ride.locationName,
    address: ride.locationAddress,
    latitude: ride.latitude,
    longitude: ride.longitude,
  };
  const destination: Stop | null =
    ride.model === "functional"
      ? {
          name: ride.destinationName,
          address: ride.destinationAddress,
          latitude: ride.destinationLatitude,
          longitude: ride.destinationLongitude,
        }
      : null;
  const pickupAt = coordsOf(start);
  const targetAt = coordsOf(destination);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ink-soft text-xs font-semibold tracking-wide uppercase">
        {strings.where}
      </h2>
      <div className="border-line divide-line divide-y overflow-hidden rounded-2xl border">
        {pickupAt || targetAt ? (
          <LazyRideMap
            pickup={pickupAt}
            destination={targetAt}
            label={strings.map}
            unavailable={strings.mapUnavailable}
            className="h-40 rounded-none border-0"
          />
        ) : null}
        <StopRow
          icon={MapPin}
          label={strings.start}
          stop={start}
          empty={strings.noPlace}
          openInMaps={openInMaps}
        />
        {destination ? (
          <StopRow
            icon={MapPinned}
            label={strings.destination}
            stop={destination}
            empty={strings.noPlace}
            openInMaps={openInMaps}
          />
        ) : null}
      </div>
    </section>
  );
}

function StopRow({
  icon: Icon,
  label,
  stop,
  empty,
  openInMaps,
}: {
  icon: LucideIcon;
  label: string;
  stop: Stop;
  empty: string;
  openInMaps: string;
}) {
  const name = stop.name?.trim() || null;
  const address =
    stop.address?.trim() && stop.address.trim() !== name
      ? stop.address.trim()
      : null;
  const maps = googleMapsUrl(stop);

  return (
    <div className="flex items-start gap-3 p-4">
      <Icon
        aria-hidden
        className="text-mint-deep mt-0.5 size-4 shrink-0"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-2sm text-ink-soft">{label}</p>
        {name || address ? (
          <>
            {name ? <p className="font-medium">{name}</p> : null}
            {address ? (
              <p className="text-2sm text-ink-soft">{address}</p>
            ) : null}
          </>
        ) : (
          <p className="text-2sm text-ink-soft">{empty}</p>
        )}
        {maps ? (
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="text-2sm inline-flex min-h-11 w-fit items-center gap-1.25 font-medium underline underline-offset-2"
          >
            <ExternalLink
              aria-hidden
              className="size-3.5"
            />
            {openInMaps}
          </a>
        ) : null}
      </div>
    </div>
  );
}
