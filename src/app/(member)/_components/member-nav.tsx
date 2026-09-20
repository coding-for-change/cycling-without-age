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
import { ChatBadge } from "@/features/chat/components/chat-badge";
import { ICONS } from "@/components/icons";
import {
  activeTabKey,
  type MemberNavKey,
  type ResolvedMemberNavItem,
} from "../nav";


export function MemberNav({
  items,
  groupLabel,
  badges,
}: {
  items: ResolvedMemberNavItem[];
  groupLabel: string;
  badges?: Partial<Record<MemberNavKey, number>>;
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
