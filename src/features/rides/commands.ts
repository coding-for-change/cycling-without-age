import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "rides",
    group: "navigate",
    label: dict.admin.nav.rides,
    icon: "rides",
    run: { kind: "navigate", href: "/admin/rides" },
    keywords: ["trips", "bookings", "schedule", "week", "calendar"],
  },
  {
    id: "new-ride",
    group: "create",
    label: dict.admin.commands.newRide,
    icon: "rides",
    run: { kind: "navigate", href: "/admin/rides?new=1" },
    keywords: ["schedule", "book", "trip", "add", "create"],
  },
];
