import type { ActiveScope, AdminScope } from "@/lib/access";
import type { IconKey } from "@/lib/commands";
import type { Dictionary } from "@/lib/i18n";

export type NavKey =
  | "overview"
  | "rides"
  | "members"
  | "training"
  | "passengers"
  | "bikes"
  | "locations"
  | "chat"
  | "reports"
  | "chapters"
  | "countries"
  | "admins"
  | "myChapter"
  | "help";

export type NavGroup = "main" | "organisation" | "footer";

export type NavItem = {
  key: NavKey;
  href: string;
  group: NavGroup;
  icon: IconKey;
  visible?: (scope: AdminScope) => boolean;
  resolve?: (scope: AdminScope, active?: ActiveScope) => string | null;
};

export const MY_CHAPTER_HREF = "/admin/settings";

export const chapterHref = (chapterId: string) =>
  `/admin/chapters/${encodeURIComponent(chapterId)}`;

/**
 * The destination follows the active scope so the sidebar links straight to
 * the chapter page. Outside a chapter scope an admin who can see the Chapters
 * list already has it one row up, so the row steps aside; everyone else lands
 * on the picker behind MY_CHAPTER_HREF.
 */
export function myChapterHref(
  scope: AdminScope,
  active?: ActiveScope,
): string | null {
  const chapter =
    active?.kind === "chapter"
      ? active.chapter
      : scope.chapters.length === 1
        ? scope.chapters[0]
        : null;
  if (chapter) return chapterHref(chapter.id);
  if (active && scope.canSeeChapters) return null;
  return MY_CHAPTER_HREF;
}

export const NAV: readonly NavItem[] = [
  { key: "overview", href: "/admin", group: "main", icon: "overview" },
  { key: "rides", href: "/admin/rides", group: "main", icon: "rides" },
  { key: "members", href: "/admin/members", group: "main", icon: "members" },
  {
    key: "training",
    href: "/admin/training",
    group: "main",
    icon: "training",
  },
  {
    key: "passengers",
    href: "/admin/passengers",
    group: "main",
    icon: "passengers",
  },
  { key: "bikes", href: "/admin/trishaws", group: "main", icon: "bikes" },
  {
    key: "locations",
    href: "/admin/locations",
    group: "main",
    icon: "locations",
  },
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
    key: "admins",
    href: "/admin/admins",
    group: "organisation",
    icon: "admins",
    visible: (scope) => scope.global,
  },
  {
    key: "myChapter",
    href: MY_CHAPTER_HREF,
    group: "footer",
    icon: "settings",
    visible: (scope) => scope.chapters.length > 0,
    resolve: myChapterHref,
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

export const canReach = (scope: AdminScope, key: NavKey): boolean => {
  const item = NAV.find((row) => row.key === key);
  return item ? (item.visible?.(scope) ?? true) : false;
};

export const navHref = (
  item: NavItem,
  scope: AdminScope,
  active?: ActiveScope,
): string | null => (item.resolve ? item.resolve(scope, active) : item.href);

export const resolveNav = (
  scope: AdminScope,
  labels: Dictionary["admin"]["nav"],
  active?: ActiveScope,
): ResolvedNavItem[] =>
  navFor(scope).flatMap((item) => {
    const href = navHref(item, scope, active);
    return href
      ? [
          {
            key: item.key,
            href,
            group: item.group,
            icon: item.icon,
            label: labels[item.key],
          },
        ]
      : [];
  });
