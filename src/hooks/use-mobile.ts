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

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => mediaQuery().matches,
    () => false,
  );
}
