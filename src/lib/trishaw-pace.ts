export const TRISHAW_SLOWDOWN = 1.5;

export const trishawSeconds = (cyclingSeconds: number) =>
  Math.round(cyclingSeconds * TRISHAW_SLOWDOWN);

export const trishawRoute = <T extends { durationSec: number }>(
  route: T | null,
): T | null =>
  route && { ...route, durationSec: trishawSeconds(route.durationSec) };
