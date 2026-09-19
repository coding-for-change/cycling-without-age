"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ICONS } from "@/components/icons";
import { activeTabKey, type ResolvedMemberNavItem } from "../nav";


export function MemberNav({
  items,
  groupLabel,
}: {
  items: ResolvedMemberNavItem[];
  groupLabel: string;
}) {
  const pathname = usePathname();
  const current = activeTabKey(pathname, items);

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu aria-label={groupLabel}>
          {items
            .filter((item) => item.tab)
            .map(({ key, href, label, icon }) => {
              const Icon = ICONS[icon];
              const active = key === current;

              return (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={label}
                  >
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon aria-hidden />
                      <span>{label}</span>
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
