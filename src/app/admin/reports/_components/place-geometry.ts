const RADIUS_MIN = 10;
const RADIUS_MAX = 32;

export const totalRides = (chapters: { rides: number }[]) =>
  chapters.reduce((sum, chapter) => sum + chapter.rides, 0);

export const radiusStops = (
  largest: number,
): [number, number, number, number] => [
  0,
  RADIUS_MIN,
  Math.max(1, Math.sqrt(largest)),
  RADIUS_MAX,
];
