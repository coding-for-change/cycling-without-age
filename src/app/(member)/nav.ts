import type { IconKey } from "@/lib/commands";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import type { MemberPerspective } from "@/lib/redirects";
import { matchesPath } from "@/lib/nav-match";

export type { MemberPerspective };

export type MemberNavKey =
  "home" | "rides" | "calendar" | "chat" | "training" | "profile";

export type MemberNavRow = {
  key: MemberNavKey;
  path: string;
  icon: IconKey;
  symbol: string;
  tab: boolean;
  parent?: MemberNavKey;
  only?: MemberPerspective;
};

export const MEMBER_NAV: readonly MemberNavRow[] = [
  { key: "home", path: "", icon: "home", symbol: "house.fill", tab: true },
  {
    key: "rides",
    path: "/rides",
    icon: "rides",
    symbol: "bicycle",
    tab: true,
  },
  {
    key: "calendar",
    path: "/calendar",
    icon: "calendar",
    symbol: "calendar",
    tab: true,
  },
  {
    key: "chat",
    path: "/chat",
    icon: "chat",
    symbol: "bubble.left.and.bubble.right.fill",
    tab: true,
  },
  {
    key: "training",
    path: "/training",
    icon: "training",
    symbol: "graduationcap.fill",
    tab: false,
    parent: "home",
    only: "pilot",
  },
  {
    key: "profile",
    path: "/profile",
    icon: "profile",
    symbol: "person.crop.circle.fill",
    tab: false,
    parent: "home",
  },
];

export type MemberNavItem = {
  key: MemberNavKey;
  href: string;
  icon: IconKey;
  symbol: string;
  tab: boolean;
  parent?: MemberNavKey;
};

export type ResolvedMemberNavItem = MemberNavItem & { label: string };

export const memberNav = (perspective: MemberPerspective): MemberNavItem[] =>
  MEMBER_NAV.filter(
    ({ only }) => only === undefined || only === perspective,
  ).map(({ key, path, icon, symbol, tab, parent }) => ({
    key,
    href: `${PERSPECTIVE_HOME[perspective]}${path}`,
    icon,
    symbol,
    tab,
    parent,
  }));

export type MemberNavLabels = Record<MemberNavKey, string>;

export const resolveMemberNav = (
  perspective: MemberPerspective,
  labels: MemberNavLabels,
): ResolvedMemberNavItem[] =>
  memberNav(perspective).map((item) => ({ ...item, label: labels[item.key] }));

export const activeItem = <T extends { href: string }>(
  pathname: string,
  items: readonly T[],
): T | null =>
  items.reduce<T | null>(
    (best, item) =>
      matchesPath(pathname, item.href) &&
      (best === null || item.href.length > best.href.length)
        ? item
        : best,
    null,
  );

export const activeTabKey = <
  T extends { key: MemberNavKey; href: string; parent?: MemberNavKey },
>(
  pathname: string,
  items: readonly T[],
): MemberNavKey | null => {
  const item = activeItem(pathname, items);
  return item === null ? null : (item.parent ?? item.key);
};

const trimSlash = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

export const isDrillDown = <T extends { href: string; tab: boolean }>(
  pathname: string,
  items: readonly T[],
): boolean => {
  const item = activeItem(pathname, items);
  if (item === null) return false;
  return !item.tab || trimSlash(pathname) !== trimSlash(item.href);
};

export const parentItem = <
  T extends { key: MemberNavKey; href: string; parent?: MemberNavKey },
>(
  pathname: string,
  items: readonly T[],
): T | null => {
  const item = activeItem(pathname, items);
  if (item === null) return null;
  if (trimSlash(pathname) !== trimSlash(item.href)) return item;
  return items.find((candidate) => candidate.key === item.parent) ?? null;
};

const CONVERSATION_PATH = /^\/(?:pilot|passenger)\/chat\/[^/]+\/?$/;

export const isConversationPath = (pathname: string): boolean =>
  CONVERSATION_PATH.test(pathname);

const TRAINING_STEP_PATH = /^\/pilot\/training\/[^/]+\/[^/]+\/?$/;

export const isTrainingStepPath = (pathname: string): boolean =>
  TRAINING_STEP_PATH.test(pathname);

export const hidesTabBar = (pathname: string): boolean =>
  isConversationPath(pathname) || isTrainingStepPath(pathname);

/**
 * The keyboard never hides the native tabs: hiding them moves the WebView out
 * of the tab controller, which takes the focus and closes the keyboard again.
 * The keyboard covers the tab bar anyway.
 */
export const hidesNativeTabs = ({
  pathname,
  narrow,
  overlayOpen,
}: {
  pathname: string;
  narrow: boolean;
  overlayOpen: boolean;
}): boolean => !narrow || overlayOpen || hidesTabBar(pathname);

export type MemberPrimaryAction = { href: string; icon: IconKey };

export const primaryAction = (
  perspective: MemberPerspective,
): MemberPrimaryAction => ({
  href:
    perspective === "passenger"
      ? `${PERSPECTIVE_HOME.passenger}/rides/new`
      : `${PERSPECTIVE_HOME[perspective]}#open-rides`,
  icon: "rides",
});

export { nextPerspective } from "@/lib/perspectives";
