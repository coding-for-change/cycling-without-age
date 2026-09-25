export type Coords = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_008.8;

export function distanceMeters(a: Coords, b: Coords): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestOverlap<T extends { coords: Coords; radiusKm: number }>(
  center: Coords,
  radiusKm: number,
  others: readonly T[],
): { pin: T; metres: number } | null {
  return (
    others
      .map((pin) => ({ pin, metres: distanceMeters(center, pin.coords) }))
      .filter(({ pin, metres }) => metres < (radiusKm + pin.radiusKm) * 1000)
      .sort((a, b) => a.metres - b.metres)[0] ?? null
  );
}

export function circleRing(
  center: Coords,
  radiusM: number,
  steps = 64,
): [number, number][] {
  const rad = Math.PI / 180;
  const dLat = radiusM / EARTH_RADIUS_M / rad;
  const dLng = dLat / Math.cos(center.lat * rad);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    ring.push([
      center.lng + dLng * Math.cos(angle),
      center.lat + dLat * Math.sin(angle),
    ]);
  }
  return ring;
}

export function googleMapsUrl(place: {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}): string | null {
  const query =
    place.latitude != null && place.longitude != null
      ? `${place.latitude},${place.longitude}`
      : place.address?.trim();
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}
