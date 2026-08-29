"use client";

/* Admin back-office shell — serves every /admin route. This branch is
   chapter-admin only (Petra Klein @ München); the super-admin / global
   multi-country view is deferred to a follow-up branch. */

import "./i18n";
import "./admin.css";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { AppBoot } from "@/components/AppBoot";
import { AdminShell, type SideGroup } from "@/components/AdminShell";
import { chapterOf, mucRides } from "./parts";

/* breadcrumb labels by path segment */
const CRUMBS: [string, string][] = [
  ["/admin/requests", "admin.nav.requests"],
  ["/admin/calendar", "admin.nav.calendar"],
  ["/admin/rides", "admin.nav.rides"],
  ["/admin/events", "admin.nav.events"],
  ["/admin/chats", "admin.nav.chats"],
  ["/admin/pilots", "admin.nav.pilots"],
  ["/admin/training", "common.training"],
  ["/admin/clients", "admin.nav.clients"],
  ["/admin/partners", "admin.nav.partners"],
  ["/admin/fleet", "admin.nav.resources"],
  ["/admin/settings", "admin.nav.settings"],
];

function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const db = useStore((s) => s.db)!;

  const ch = chapterOf(db);
  const reqN = mucRides(db).filter((r) => r.status === "requested").length;

  const groups: SideGroup[] = [
    {
      label: t("admin.grp.ops"),
      items: [
        {
          href: "/admin",
          icon: "dashboard",
          label: t("admin.nav.dashboard"),
          exact: true,
        },
        {
          href: "/admin/requests",
          icon: "bell",
          label: t("admin.nav.requests"),
          badge: reqN || undefined,
        },
        {
          href: "/admin/calendar",
          icon: "calendar",
          label: t("admin.nav.calendar"),
        },
        { href: "/admin/rides", icon: "bike", label: t("admin.nav.rides") },
        { href: "/admin/events", icon: "users", label: t("admin.nav.events") },
        { href: "/admin/chats", icon: "chat", label: t("admin.nav.chats") },
      ],
    },
    {
      label: t("admin.grp.people"),
      items: [
        { href: "/admin/pilots", icon: "users", label: t("admin.nav.pilots") },
        {
          href: "/admin/training",
          icon: "clipboard",
          label: t("common.training"),
        },
        { href: "/admin/clients", icon: "user", label: t("admin.nav.clients") },
        {
          href: "/admin/partners",
          icon: "building",
          label: t("admin.nav.partners"),
        },
      ],
    },
    {
      label: t("admin.grp.setup"),
      items: [
        {
          href: "/admin/fleet",
          icon: "warehouse",
          label: t("admin.nav.resources"),
        },
        {
          href: "/admin/settings",
          icon: "settings",
          label: t("admin.nav.settings"),
        },
      ],
    },
  ];

  const crumbKey =
    CRUMBS.find(([p]) => pathname.startsWith(p))?.[1] || "admin.nav.dashboard";

  return (
    <AdminShell
      subtitle={ch?.name || "München"}
      groups={groups}
      userName="Petra Klein"
      userRole={t("admin.role")}
      breadcrumbRoot={ch?.name || "München"}
      breadcrumb={t(crumbKey)}
    >
      {children}
    </AdminShell>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppBoot
      audiences={["admin", "global"]}
      watch={{ persona: "admin", icon: "dashboard", appName: "CWA Admin" }}
    >
      <Shell>{children}</Shell>
    </AppBoot>
  );
}
