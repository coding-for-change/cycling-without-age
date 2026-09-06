import type { Coords } from "@/lib/geo";

if (typeof window !== "undefined") {
  throw new Error("@/lib/mapbox is server-only — call it from a Server Action");
}

const TOKEN =
  process.env.MAPBOX_TOKEN ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
const SEARCH = "https://api.mapbox.com/search/searchbox/v1";
const DIRECTIONS = "https://api.mapbox.com/directions/v5/mapbox";
const TIMEOUT_MS = 4000;

export type PlaceSuggestion = {
  id: string;
  /** The bold first line — a street and number. */
  name: string;
  /** The rest of the address, already assembled by Mapbox for display. */
  context: string;
};

export type ResolvedPlace = { address: string; coords: Coords };

export type Route = {
  /** GeoJSON LineString coordinates, `[lng, lat]` — what mapbox-gl wants. */
  path: [number, number][];
  durationSec: number;
  distanceM: number;
};

async function get<T>(url: string): Promise<T | null> {
  if (!TOKEN) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function suggestPlaces(
  query: string,
  sessionToken: string,
  { language, country }: { language?: string; country?: string } = {},
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    session_token: sessionToken,
    access_token: TOKEN ?? "",
    types: "address,street,place",
    limit: "5",
    ...(language ? { language } : {}),
    ...(country ? { country } : {}),
  });

  const data = await get<{
    suggestions?: {
      mapbox_id: string;
      name: string;
      place_formatted?: string;
      full_address?: string;
    }[];
  }>(`${SEARCH}/suggest?${params}`);

  return (data?.suggestions ?? []).map((s) => ({
    id: s.mapbox_id,
    name: s.name,
    context: s.place_formatted ?? s.full_address ?? "",
  }));
}

/** Turns a chosen suggestion into an address and a position. Same session token
 *  as the `suggest` calls that led to it, or the session is billed twice. */
export async function retrievePlace(
  mapboxId: string,
  sessionToken: string,
): Promise<ResolvedPlace | null> {
  const params = new URLSearchParams({
    session_token: sessionToken,
    access_token: TOKEN ?? "",
  });

  const data = await get<{
    features?: {
      properties?: { full_address?: string; name?: string };
      geometry?: { coordinates?: [number, number] };
    }[];
  }>(`${SEARCH}/retrieve/${encodeURIComponent(mapboxId)}?${params}`);

  const feature = data?.features?.[0];
  const point = feature?.geometry?.coordinates;
  const address =
    feature?.properties?.full_address ?? feature?.properties?.name;
  if (!point || !address) return null;

  return { address, coords: { lng: point[0], lat: point[1] } };
}

/** The trishaw is a bike, so the cycling profile is the honest one — both for the
 *  path it may take and for the minutes it takes to get there. */
export async function cyclingRoute(
  from: Coords,
  to: Coords,
): Promise<Route | null> {
  const pair = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const params = new URLSearchParams({
    access_token: TOKEN ?? "",
    geometries: "geojson",
    overview: "simplified",
  });

  const data = await get<{
    routes?: {
      duration: number;
      distance: number;
      geometry: { coordinates: [number, number][] };
    }[];
  }>(`${DIRECTIONS}/cycling/${pair}?${params}`);

  const route = data?.routes?.[0];
  if (!route) return null;
  return {
    path: route.geometry.coordinates,
    durationSec: route.duration,
    distanceM: route.distance,
  };
}
