export const DIGEST_DEBOUNCE_MS = 300_000;
export const DIGEST_MAX_WAIT_MS = 900_000;

export const digestDelay = ({
  windowStartedAt,
  now,
}: {
  windowStartedAt: number;
  now: number;
}) =>
  Math.max(
    0,
    Math.min(DIGEST_DEBOUNCE_MS, windowStartedAt + DIGEST_MAX_WAIT_MS - now),
  );

export const isMuted = (mutedUntil: string | null, now = Date.now()) =>
  mutedUntil !== null && Date.parse(mutedUntil) > now;
