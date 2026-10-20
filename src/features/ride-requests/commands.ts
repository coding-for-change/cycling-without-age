import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "ride-requests",
    group: "navigate",
    label: dict.admin.rideRequests.title,
    icon: "rides",
    run: { kind: "navigate", href: "/admin/rides/requests" },
    keywords: [
      "requests",
      "bookings",
      "inbox",
      "waiting",
      "schedule",
      "decline",
    ],
  },
];
