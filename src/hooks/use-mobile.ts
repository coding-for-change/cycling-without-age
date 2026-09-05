import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

let query: MediaQueryList | null = null;
const mediaQuery = () => (query ??= window.matchMedia(QUERY));

const subscribe = (onChange: () => void) => {
  const mql = mediaQuery();
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

/**
 * `useSyncExternalStore`, not `useState` + an effect: the server has no viewport,
 * so it always reports desktop, and a consumer that hydrates late — anything
 * streamed in behind `<Suspense>` — would otherwise be reconciled against
 * already-mobile client state and throw a hydration mismatch. This hook hands
 * React the server snapshot to hydrate against and lets it swap afterwards.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => mediaQuery().matches,
    () => false,
  );
}
