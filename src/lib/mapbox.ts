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

export type PlaceKind = "address" | "poi" | "place";

export type PlaceSuggestion = {
  id: string;
  /** The bold first line — a street and number, or a point of interest's name. */
  name: string;
  /** The rest of the address, already assembled by Mapbox for display. */
  context: string;
  kind: PlaceKind;
};

export type ResolvedPlace = {
  address: string;
  coords: Coords;
  /** The town the place sits in, when Mapbox knows it. */
  city: string | null;
  /** ISO 3166-1 alpha-2, upper case. */
  countryCode: string | null;
  /** Set when the chosen result was a point of interest rather than an address. */
  poiName: string | null;
};

const DEFAULT_TYPES = "address,street,place";

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

const kindOf = (featureType: string | undefined): PlaceKind =>
  featureType === "poi" ? "poi" : featureType === "place" ? "place" : "address";

export async function suggestPlaces(
  query: string,
  sessionToken: string,
  {
    language,
    country,
    types = DEFAULT_TYPES,
  }: { language?: string; country?: string; types?: string } = {},
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    session_token: sessionToken,
    access_token: TOKEN ?? "",
    types,
    limit: "5",
    ...(language ? { language } : {}),
    ...(country ? { country } : {}),
  });

  const data = await get<{
    suggestions?: {
      mapbox_id: string;
      name: string;
      feature_type?: string;
      place_formatted?: string;
      full_address?: string;
    }[];
  }>(`${SEARCH}/suggest?${params}`);

  return (data?.suggestions ?? []).map((s) => ({
    id: s.mapbox_id,
    name: s.name,
    context: s.place_formatted ?? s.full_address ?? "",
    kind: kindOf(s.feature_type),
  }));
}

type SearchFeature = {
  properties?: {
    full_address?: string;
    name?: string;
    feature_type?: string;
    context?: {
      place?: { name?: string };
      locality?: { name?: string };
      country?: { country_code?: string };
    };
  };
  geometry?: { coordinates?: [number, number] };
};

function toPlace(feature: SearchFeature | undefined): ResolvedPlace | null {
  const point = feature?.geometry?.coordinates;
  const props = feature?.properties;
  const address = props?.full_address ?? props?.name;
  if (!point || !address) return null;

  const context = props?.context;
  return {
    address,
    coords: { lng: point[0], lat: point[1] },
    city: context?.place?.name ?? context?.locality?.name ?? null,
    countryCode: context?.country?.country_code?.toUpperCase() ?? null,
    poiName: props?.feature_type === "poi" ? (props.name ?? null) : null,
  };
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

  const data = await get<{ features?: SearchFeature[] }>(
    `${SEARCH}/retrieve/${encodeURIComponent(mapboxId)}?${params}`,
  );
  return toPlace(data?.features?.[0]);
}

/** The address under a dragged pin. Not session-billed, so no token to pass. */
export async function reversePlace(
  coords: Coords,
  { language }: { language?: string } = {},
): Promise<ResolvedPlace | null> {
  const params = new URLSearchParams({
    longitude: String(coords.lng),
    latitude: String(coords.lat),
    types: "address,street,place",
    access_token: TOKEN ?? "",
    ...(language ? { language } : {}),
  });

  const data = await get<{ features?: SearchFeature[] }>(
    `${SEARCH}/reverse?${params}`,
  );
  const place = toPlace(data?.features?.[0]);
  // The pin is the truth; the reverse lookup only names it.
  return place && { ...place, coords };
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
