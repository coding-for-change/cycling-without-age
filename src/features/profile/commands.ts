import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "settings",
    group: "navigate",
    label: dict.admin.nav.settings,
    icon: "settings",
    run: { kind: "navigate", href: "/admin/settings" },
    keywords: ["preferences", "radius", "contact"],
  },
];
