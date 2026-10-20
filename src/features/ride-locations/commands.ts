import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "ride-locations",
    group: "navigate",
    label: dict.admin.nav.rideLocations,
    icon: "mapPin",
    run: { kind: "navigate", href: "/admin/ride-locations" },
    keywords: [
      "care center",
      "care home",
      "residence",
      "pickup",
      "start",
      "places",
    ],
  },
  {
    id: "new-ride-location",
    group: "create",
    label: dict.admin.rideLocations.commandNew,
    icon: "mapPin",
    run: { kind: "navigate", href: "/admin/ride-locations?new=1" },
    keywords: ["add", "create", "care center", "care home", "place"],
  },
];
