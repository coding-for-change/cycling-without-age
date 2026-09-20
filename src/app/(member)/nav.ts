import type { Perspective } from "@/lib/access";
import type { IconKey } from "@/lib/commands";
import { PERSPECTIVE_HOME } from "@/lib/redirects";
import type { MemberPerspective } from "@/lib/redirects";
import { matchesPath } from "@/lib/nav-match";

export type { MemberPerspective };

export type MemberNavKey = "home" | "rides" | "calendar" | "chat" | "training";

export type MemberNavRow = {
  key: MemberNavKey;
  path: string;
  icon: IconKey;
  tab: boolean;
  parent?: MemberNavKey;
  only?: MemberPerspective;
};

export const MEMBER_NAV: readonly MemberNavRow[] = [
  { key: "home", path: "", icon: "home", tab: true },
  { key: "rides", path: "/rides", icon: "rides", tab: true },
  { key: "calendar", path: "/calendar", icon: "calendar", tab: true },
  { key: "chat", path: "/chat", icon: "chat", tab: true },
  {
    key: "training",
    path: "/training",
    icon: "training",
    tab: false,
    parent: "home",
    only: "pilot",
  },
];

export type MemberNavItem = {
  key: MemberNavKey;
  href: string;
  icon: IconKey;
  tab: boolean;
  parent?: MemberNavKey;
};

export type ResolvedMemberNavItem = MemberNavItem & { label: string };

export const memberNav = (perspective: MemberPerspective): MemberNavItem[] =>
  MEMBER_NAV.filter(
    ({ only }) => only === undefined || only === perspective,
  ).map(({ key, path, icon, tab, parent }) => ({
    key,
    href: `${PERSPECTIVE_HOME[perspective]}${path}`,
    icon,
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

export type MemberPrimaryAction = { href: string; icon: IconKey };

export const primaryAction = (
  perspective: MemberPerspective,
): MemberPrimaryAction => ({
  href: `${PERSPECTIVE_HOME[perspective]}/rides`,
  icon: "rides",
});

export const nextPerspective = (
  available: readonly Perspective[],
  current: Perspective,
): Perspective | null => {
  if (available.length < 2) return null;
  const index = available.indexOf(current);
  return index === -1 ? null : available[(index + 1) % available.length];
};
