import { PERSPECTIVE_HOME } from "@/lib/redirects";

export type BackDecision =
  | "close-overlay"
  | "back"
  | { kind: "replace"; href: string }
  | "minimize";

export type BackContext = {
  overlayOpen: boolean;
  depth: number;
  pathname: string;
};

const MEMBER_HOMES = [PERSPECTIVE_HOME.pilot, PERSPECTIVE_HOME.passenger];

/** A member surface below its perspective home — the home itself is not one. */
const memberHome = (pathname: string) =>
  MEMBER_HOMES.find((home) => pathname.startsWith(`${home}/`)) ?? null;

/**
 * What the Android hardware back button does, as pure data so it can be tested
 * without a WebView. Order matters: an open overlay swallows the press, then a
 * real history entry, then a tab that falls back to its perspective home, and
 * only a back press on a home with nothing behind it leaves the app.
 */
export function decideBack({ overlayOpen, depth, pathname }: BackContext): BackDecision {
  if (overlayOpen) return "close-overlay";
  if (depth > 0) return "back";

  const home = memberHome(pathname);
  return home ? { kind: "replace", href: home } : "minimize";
}
