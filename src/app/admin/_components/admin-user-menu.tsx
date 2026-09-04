"use client";

import Link from "next/link";
import { CircleUserRound, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getInitials } from "@/lib/utils";
import { useSignOut } from "@/components/sign-out-button";

export function AdminUserMenu({
  name,
  email,
  image,
  strings,
}: {
  name: string;
  email: string;
  image?: string | null;
  strings: { menuLabel: string; account: string; signOut: string };
}) {
  const { signOut, pending } = useSignOut();

  const avatar = (
    <Avatar className="size-8 rounded-lg">
      {image && (
        <AvatarImage
          src={image}
          alt=""
        />
      )}
      <AvatarFallback className="rounded-lg bg-mint-tint text-xs font-semibold text-ink">
        {getInitials(name || email)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={strings.menuLabel}
              className="data-[state=open]:bg-mint-tint"
            >
              {avatar}
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-ink-soft">{email}</span>
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={8}
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-2xl border-line p-2"
          >
            <div className="flex items-center gap-3 px-2 py-2">
              {avatar}
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="truncate text-xs text-ink-soft">{email}</span>
              </span>
            </div>
            <DropdownMenuSeparator className="bg-line" />
            <DropdownMenuItem
              asChild
              className="gap-3 rounded-xl py-2.5"
            >
              <Link href="/admin/settings">
                <CircleUserRound
                  aria-hidden
                  className="size-4 text-ink-soft"
                />
                {strings.account}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={pending}
              onSelect={signOut}
              className="gap-3 rounded-xl py-2.5"
            >
              <LogOut
                aria-hidden
                className="size-4 text-ink-soft"
              />
              {strings.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
