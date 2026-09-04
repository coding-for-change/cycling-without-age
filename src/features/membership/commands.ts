import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "members",
    group: "navigate",
    label: dict.admin.nav.members,
    icon: "members",
    run: { kind: "navigate", href: "/admin/members" },
    keywords: ["pilots", "applications", "approve", "volunteers"],
  },
];
