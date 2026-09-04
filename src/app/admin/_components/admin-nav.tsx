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
import type { ResolvedNavItem } from "../nav";
import { ICONS } from "./icons";

/**
 * `/admin` is a prefix of every other destination, so the overview only lights
 * up on an exact match. Everything else matches its own subtree, which is what
 * keeps "Members" active on a member's detail page later on.
 */
const matches = (pathname: string, href: string) =>
  href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);

export function AdminNav({
  items,
  label,
  groupLabel,
}: {
  items: ResolvedNavItem[];
  label?: string;
  groupLabel?: string;
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
                  className="data-[active=true]:bg-mint-tint data-[active=true]:text-ink"
                >
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon aria-hidden />
                    <span>{itemLabel}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
