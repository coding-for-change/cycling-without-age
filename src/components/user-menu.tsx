"use client";

import { useState } from "react";
import { CircleUserRound, LogOut } from "lucide-react";
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
import { useSignOut } from "@/components/sign-out-button";
import { PersonAvatar } from "@/components/person-avatar";
import { AccountSurface } from "@/components/account/account-surface";
import type { AccountData } from "@/components/account/types";
import type { Perspective } from "@/lib/access";

export function UserMenu({
  data,
  activePerspective,
  strings,
}: {
  data: AccountData;
  activePerspective: Perspective;
  strings: { menuLabel: string; account: string; signOut: string };
}) {
  const { signOut, pending } = useSignOut();
  const [accountOpen, setAccountOpen] = useState(false);
  const { name, email, avatar, avatarAnimated } = data.profile;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={strings.menuLabel}
              className="data-[state=open]:bg-canvas-deeper"
            >
              <PersonAvatar svg={avatar} />
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
              <PersonAvatar
                svg={avatarAnimated}
                size="lg"
              />
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="truncate text-xs text-ink-soft">{email}</span>
              </span>
            </div>
            <DropdownMenuSeparator className="bg-line" />
            <DropdownMenuItem
              onSelect={() => setAccountOpen(true)}
              className="gap-3 rounded-xl py-2.5"
            >
              <CircleUserRound
                aria-hidden
                className="size-4 text-ink-soft"
              />
              {strings.account}
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
        <AccountSurface
          data={data}
          activePerspective={activePerspective}
          open={accountOpen}
          onOpenChange={setAccountOpen}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
