"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { NavKey, ResolvedNavItem } from "../nav";
import { ChatBadge } from "@/features/chat/components/chat-badge";
import { ICONS } from "@/components/icons";
import { matchesPath } from "@/lib/nav-match";

const matches = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : matchesPath(pathname, href);

export function AdminNav({
  items,
  label,
  groupLabel,
  badges,
}: {
  items: ResolvedNavItem[];
  label?: string;
  groupLabel?: string;
  badges?: Partial<Record<NavKey, number>>;
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu aria-label={groupLabel}>
          {items.map(({ key, href, label: itemLabel, icon }) => {
            const Icon = ICONS[icon];
            const active = matches(pathname, href);

            return (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={itemLabel}
                >
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon aria-hidden />
                    <span>{itemLabel}</span>
                  </Link>
                </SidebarMenuButton>
                <ChatBadge
                  count={badges?.[key] ?? 0}
                  className="pointer-events-none absolute top-1.5 right-1 select-none group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
