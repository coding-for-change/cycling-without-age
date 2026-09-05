import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "chapters",
    group: "navigate",
    label: dict.admin.nav.chapters,
    icon: "chapters",
    run: { kind: "navigate", href: "/admin/chapters" },
    keywords: ["locations", "groups", "care homes"],
    visible: (scope) => scope.canSeeChapters,
  },
  {
    id: "countries",
    group: "navigate",
    label: dict.admin.nav.countries,
    icon: "countries",
    run: { kind: "navigate", href: "/admin/countries" },
    keywords: ["regions", "country admins"],
    visible: (scope) => scope.canSeeCountries,
  },
  {
    id: "new-chapter",
    group: "create",
    label: dict.admin.commands.newChapter,
    icon: "chapters",
    run: { kind: "navigate", href: "/admin/chapters?new=1" },
    keywords: ["add", "create", "location", "care home"],
    visible: (scope) => scope.canSeeChapters,
  },
  {
    id: "new-country",
    group: "create",
    label: dict.admin.commands.newCountry,
    icon: "countries",
    run: { kind: "navigate", href: "/admin/countries?new=1" },
    keywords: ["add", "create", "region"],
    visible: (scope) => scope.canSeeCountries,
  },
];
