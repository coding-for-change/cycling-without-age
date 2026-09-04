import type { AdminScope } from "@/lib/access";
import type { IconKey } from "@/lib/commands";
import type { Dictionary } from "@/lib/i18n";

export type NavKey =
  | "overview"
  | "rides"
  | "members"
  | "passengers"
  | "bikes"
  | "chat"
  | "reports"
  | "chapters"
  | "countries"
  | "settings"
  | "help";

export type NavGroup = "main" | "organisation" | "footer";

export type NavItem = {
  key: NavKey;
  href: string;
  group: NavGroup;
  icon: IconKey;
  visible?: (scope: AdminScope) => boolean;
};

export const NAV: readonly NavItem[] = [
  { key: "overview", href: "/admin", group: "main", icon: "overview" },
  { key: "rides", href: "/admin/rides", group: "main", icon: "rides" },
  { key: "members", href: "/admin/members", group: "main", icon: "members" },
  {
    key: "passengers",
    href: "/admin/passengers",
    group: "main",
    icon: "passengers",
  },
  { key: "bikes", href: "/admin/bikes", group: "main", icon: "bikes" },
  { key: "chat", href: "/admin/chat", group: "main", icon: "chat" },
  {
    key: "reports",
    href: "/admin/reports",
    group: "organisation",
    icon: "reports",
  },
  {
    key: "chapters",
    href: "/admin/chapters",
    group: "organisation",
    icon: "chapters",
    visible: (scope) => scope.canSeeChapters,
  },
  {
    key: "countries",
    href: "/admin/countries",
    group: "organisation",
    icon: "countries",
    visible: (scope) => scope.canSeeCountries,
  },
  {
    key: "settings",
    href: "/admin/settings",
    group: "footer",
    icon: "settings",
  },
  { key: "help", href: "/admin/help", group: "footer", icon: "help" },
];

export type ResolvedNavItem = {
  key: NavKey;
  href: string;
  group: NavGroup;
  icon: IconKey;
  label: string;
};

export const navFor = (scope: AdminScope): NavItem[] =>
  NAV.filter((item) => item.visible?.(scope) ?? true);

export const resolveNav = (
  scope: AdminScope,
  labels: Dictionary["admin"]["nav"],
): ResolvedNavItem[] =>
  navFor(scope).map(({ key, href, group, icon }) => ({
    key,
    href,
    group,
    icon,
    label: labels[key],
  }));
