export type Arrival = {
  origin: string;
  currentPath: string;
  landingUrl: string | null;
  referrer: string;
  historyLength: number;
};

const originOf = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

export function arrivedFromApp({
  origin,
  currentPath,
  landingUrl,
  referrer,
  historyLength,
}: Arrival) {
  if (historyLength <= 1 || landingUrl === null) return false;
  if (new URL(landingUrl).pathname !== currentPath) return true;
  return originOf(referrer) === origin;
}

export const currentArrival = (): Arrival => ({
  origin: window.location.origin,
  currentPath: window.location.pathname,
  landingUrl: performance.getEntriesByType("navigation")[0]?.name ?? null,
  referrer: document.referrer,
  historyLength: window.history.length,
});
