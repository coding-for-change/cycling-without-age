const MAX_LENGTH = 512;

/**
 * A path the app may navigate to on its own authority. `//host`, `/\\host` and
 * anything the URL parser would read as a different origin are refused, so a
 * stored or pushed href can never become an open redirect.
 */
export function isAppPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.length > MAX_LENGTH) return false;
  if (!/^\/[^/\\]/.test(value)) return false;
  try {
    return new URL(value, "http://x").origin === "http://x";
  } catch {
    return false;
  }
}
