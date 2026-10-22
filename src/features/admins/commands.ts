import type { CommandContributor } from "@/lib/commands";

export const commands: CommandContributor = (dict) => [
  {
    id: "admins",
    group: "navigate",
    label: dict.admin.nav.admins,
    icon: "admins",
    run: { kind: "navigate", href: "/admin/admins" },
    keywords: ["superadmins", "country admins", "roles", "permissions"],
    visible: (scope) => scope.global,
  },
  {
    id: "invite-superadmin",
    group: "create",
    label: dict.admin.commands.inviteSuperadmin,
    icon: "admins",
    run: { kind: "navigate", href: "/admin/admins?new=1" },
    keywords: ["add", "invite", "superadmin", "admin"],
    visible: (scope) => scope.global,
  },
];
