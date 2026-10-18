import { useSyncExternalStore } from "react";
import { REDUCED_MOTION } from "./display-preferences";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether anything should move: the phone's setting or the profile's "less
 * motion" (`data-motion` on <html>) — either one stills the app. CSS follows
 * both through globals.css; every animation driven from script asks here.
 */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  (window.matchMedia(REDUCED_MOTION_QUERY).matches ||
    document.documentElement.dataset.motion === REDUCED_MOTION);

function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  return () => {
    query.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

/** `prefersReducedMotion`, kept current — for animations owned by React. */
export const useReducedMotion = () =>
  useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
