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

const memberHome = (pathname: string) =>
  MEMBER_HOMES.find((home) => pathname.startsWith(`${home}/`)) ?? null;

export function decideBack({ overlayOpen, depth, pathname }: BackContext): BackDecision {
  if (overlayOpen) return "close-overlay";
  if (depth > 0) return "back";

  const home = memberHome(pathname);
  return home ? { kind: "replace", href: home } : "minimize";
}
