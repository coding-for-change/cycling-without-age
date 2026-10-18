export type YearRide = {
  startsAt: Date;
  endsAt: Date;
  locationName: string | null;
  pilotIds: string[];
};

export type YearInReview = {
  year: number;
  rides: number;
  /** Time spent riding, summed over the year. */
  seconds: number;
  /** Different pilots ridden with. */
  pilots: number;
  /** Where they went most — once a place has been visited at least twice. */
  favouritePlace: string | null;
};

const FAVOURITE_FROM = 2;

/**
 * A rider's year on the trishaw, from the rides that took place: how often,
 * how long, with how many pilots, and the place they kept coming back to.
 */
export function yearInReview(
  rides: YearRide[],
  year: number,
): YearInReview | null {
  if (!rides.length) return null;

  const pilots = new Set(rides.flatMap((ride) => ride.pilotIds));
  const visits = new Map<string, { count: number; last: number }>();
  for (const ride of rides) {
    const place = ride.locationName?.trim();
    if (!place) continue;
    const seen = visits.get(place) ?? { count: 0, last: 0 };
    visits.set(place, {
      count: seen.count + 1,
      last: Math.max(seen.last, ride.startsAt.getTime()),
    });
  }
  const [favourite] = [...visits.entries()]
    .filter(([, seen]) => seen.count >= FAVOURITE_FROM)
    .sort(([, a], [, b]) => b.count - a.count || b.last - a.last);

  return {
    year,
    rides: rides.length,
    seconds: rides.reduce(
      (sum, ride) =>
        sum +
        Math.max(0, ride.endsAt.getTime() - ride.startsAt.getTime()) / 1000,
      0,
    ),
    pilots: pilots.size,
    favouritePlace: favourite?.[0] ?? null,
  };
}
