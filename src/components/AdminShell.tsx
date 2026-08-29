"use client";

/* Admin back-office shell: inset sidebar + breadcrumb header. Deliberately a
   neutral tool surface — the brand shows in type and restraint, not in color. */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Icon } from "./Icon";
import { Avatar, LangMenu } from "./bits";

export interface SideItem {
  href: string;
  icon: string;
  label: string;
  badge?: string | number;
  exact?: boolean;
}

export interface SideGroup {
  label?: string;
  items: SideItem[];
}

export function AdminShell({
  subtitle,
  groups,
  userName,
  userRole,
  breadcrumbRoot,
  breadcrumb,
  footer,
  children,
}: {
  subtitle: string;
  groups: SideGroup[];
  userName: string;
  userRole: string;
  breadcrumbRoot: string;
  breadcrumb: string;
  /** extra footer content above the user row (e.g. the role switcher) */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Image
              src="/logo.png"
              alt=""
              width={30}
              height={30}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.9375rem] font-bold font-display leading-tight">
              {t("brand")}
            </div>
            <div className="truncate text-xs muted">{subtitle}</div>
          </div>
        </div>
        {groups.map((g, gi) => (
          <div
            key={gi}
            className="sidebar-group"
          >
            {g.label && <div className="sidebar-group-label">{g.label}</div>}
            {g.items.map((it) => {
              const active = it.exact
                ? pathname === it.href
                : pathname.startsWith(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn("sidebar-item", active && "active")}
                >
                  <Icon name={it.icon} />
                  <span>{it.label}</span>
                  {it.badge !== undefined && it.badge !== 0 && (
                    <span className="badge badge-solid-red">{it.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
        <div className="sidebar-footer flex flex-col gap-2">
          {footer ?? (
            <div className="flex items-center gap-2">
              <Avatar
                name={userName}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{userName}</div>
                <div className="truncate text-xs muted">{userRole}</div>
              </div>
            </div>
          )}
        </div>
      </aside>
      <div className="inset">
        <header className="inset-header">
          <Link
            href="/"
            className="icon-pill md:hidden"
            aria-label="Demo home"
          >
            <Icon name="chevronLeft" />
          </Link>
          <div className="breadcrumb flex-1">
            {breadcrumbRoot}
            <span className="muted">›</span>{" "}
            <span className="current">{breadcrumb}</span>
          </div>
          <LangMenu />
        </header>
        <div className="inset-body">
          <div className="page">{children}</div>
        </div>
      </div>
    </div>
  );
}
