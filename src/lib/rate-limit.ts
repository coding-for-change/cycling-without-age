const windows = new Map<string, number[]>();

export function withinRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): boolean {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((at) => now - at < windowMs);

  if (recent.length >= max) {
    windows.set(key, recent);
    return false;
  }

  recent.push(now);
  windows.set(key, recent);

  if (windows.size > 5_000 && Math.random() < 0.01) {
    for (const [other, times] of windows) {
      if (times.every((at) => now - at >= windowMs)) windows.delete(other);
    }
  }
  return true;
}
