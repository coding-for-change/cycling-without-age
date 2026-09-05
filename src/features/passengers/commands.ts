import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "passengers",
    group: "navigate",
    label: dict.admin.nav.passengers,
    icon: "passengers",
    run: { kind: "navigate", href: "/admin/passengers" },
    keywords: ["riders", "guests", "relatives", "carers"],
  },
];
