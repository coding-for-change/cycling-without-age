/**
 * How a member wants the app drawn: the passenger type size and whether
 * anything should move. Stored on the account and mirrored into cookies, so the
 * root layout can set both on `<html>` before the first paint.
 *
 * Kept free of `next/headers`: the picker is a Client Component and needs the
 * same names the server writes. Mirrors `i18n/locales.ts`.
 */
export const TEXT_SIZES = ["normal", "large", "xLarge"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export const DEFAULT_TEXT_SIZE: TextSize = "normal";

export const TEXT_SIZE_COOKIE = "CWA_TEXT_SIZE";
export const MOTION_COOKIE = "CWA_MOTION";
export const REDUCED_MOTION = "reduce";

/** A year: the account holds the truth, the cookie only saves a redraw. */
export const DISPLAY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const isTextSize = (value: unknown): value is TextSize =>
  (TEXT_SIZES as readonly unknown[]).includes(value);

/** The values `<html>` carries, or null to leave the attribute off. */
export const textSizeAttribute = (size: TextSize) =>
  size === DEFAULT_TEXT_SIZE ? null : size;

export const motionAttribute = (reduceMotion: boolean) =>
  reduceMotion ? REDUCED_MOTION : null;
