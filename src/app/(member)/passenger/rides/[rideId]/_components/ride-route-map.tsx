import { cacheLife } from "next/cache";
import { LazyRideMap } from "@/features/rides/components/ride-map-lazy";
import { RouteSummary } from "@/features/rides/components/place";
import type { Locale as Notation } from "@/lib/format";
import type { Coords } from "@/lib/geo";
import type { Locale } from "@/lib/i18n";
import { cyclingRoute } from "@/lib/mapbox";

async function cachedRoute(from: Coords, to: Coords) {
  "use cache";
  cacheLife("days");
  const route = await cyclingRoute(from, to);
  if (!route) throw new Error("route unavailable");
  return route;
}

export async function RideRouteMap({
  pickup,
  destination,
  label,
  unavailable,
  eta,
  language,
  notation,
}: {
  pickup: Coords | null;
  destination: Coords | null;
  label: string;
  unavailable: string;
  eta: string;
  language: Locale;
  notation: Notation;
}) {
  const route =
    pickup && destination
      ? await cachedRoute(pickup, destination).catch(() => null)
      : null;

  return (
    <div className="flex flex-col gap-2">
      <LazyRideMap
        pickup={pickup}
        destination={destination}
        route={route?.path ?? null}
        label={label}
        unavailable={unavailable}
        className="h-48 rounded-2xl"
      />
      {route ? (
        <RouteSummary
          route={route}
          template={eta}
          language={language}
          notation={notation}
          className="gap-2 text-sm"
        />
      ) : null}
    </div>
  );
}
