const MAX_LENGTH = 512;

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
