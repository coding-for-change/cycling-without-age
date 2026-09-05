"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getInitials } from "@/lib/utils";
import type { Perspective } from "@/lib/access";
import type { IconKey, ScopeArg } from "@/lib/commands";
import { ICONS } from "./icons";
import { readScopeArg, scopeHref } from "./scope-url";

export type PerspectiveOption = {
  perspective: Perspective;
  label: string;
  href: string;
  icon: IconKey;
};

export type ScopeOption = { arg: ScopeArg; label: string; icon: IconKey };

export function ScopeSwitcher({
  perspectives,
  activePerspective,
  scopes,
  defaultScope,
  roleLabel,
  strings,
}: {
  perspectives: PerspectiveOption[];
  activePerspective: Perspective;
  scopes: ScopeOption[];
  defaultScope: ScopeArg;
  roleLabel: string;
  strings: { switchLabel: string; perspective: string; label: string };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeScope = readScopeArg(
    new URLSearchParams(searchParams.toString()),
    scopes.map((s) => s.arg),
    defaultScope,
  );

  // Never empty in practice — passing `requireAdminScope` means at least one
  // chapter, one country or global reach — but a blank trigger would be a worse
  // failure than showing the role.
  const active = scopes.find((s) => s.arg === activeScope);
  const activeLabel = active?.label ?? roleLabel;
  const showPerspectives = perspectives.length > 1;
  const showScopes = scopes.length > 1;

  const identity = (
    <>
      <span
        aria-hidden
        className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-mint text-xs font-semibold text-ink"
      >
        {getInitials(activeLabel)}
      </span>
      <span className="grid flex-1 text-left leading-tight">
        <span className="truncate font-medium">{activeLabel}</span>
        <span className="truncate text-xs text-ink-soft">{roleLabel}</span>
      </span>
    </>
  );

  // One chapter, one hat: there is nothing to switch between, so this is a label
  // and not a button. A control that announces "switch perspective" and then does
  // nothing is worse than no control.
  if (!showPerspectives && !showScopes)
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex h-12 items-center gap-2 rounded-md p-2 text-sm group-data-[collapsible=icon]:p-0!">
            {identity}
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={strings.switchLabel}
              className="data-[state=open]:bg-mint-tint"
            >
              {identity}
              <ChevronsUpDown
                aria-hidden
                className="ml-auto size-4 text-ink-soft"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={8}
            className="min-w-72 rounded-2xl border-line p-2"
          >
            {showPerspectives && (
              <>
                <DropdownMenuLabel className="text-xs text-ink-soft">
                  {strings.perspective}
                </DropdownMenuLabel>
                {perspectives.map((option) => {
                  const Icon = ICONS[option.icon];
                  const current = option.perspective === activePerspective;

                  return (
                    <DropdownMenuItem
                      key={option.perspective}
                      asChild
                      className="gap-3 rounded-xl py-2.5"
                    >
                      <Link href={option.href}>
                        <Icon
                          aria-hidden
                          className="size-4 text-ink-soft"
                        />
                        {option.label}
                        {current && (
                          <Check
                            aria-hidden
                            className="ml-auto size-4"
                          />
                        )}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}

            {showPerspectives && showScopes && (
              <DropdownMenuSeparator className="bg-line" />
            )}

            {showScopes && (
              <>
                <DropdownMenuLabel className="text-xs text-ink-soft">
                  {strings.label}
                </DropdownMenuLabel>
                {scopes.map((option) => {
                  const Icon = ICONS[option.icon];
                  const current = option.arg === activeScope;

                  return (
                    <DropdownMenuItem
                      key={option.arg}
                      asChild
                      className="gap-3 rounded-xl py-2.5"
                    >
                      <Link href={scopeHref(pathname, option.arg)}>
                        <Icon
                          aria-hidden
                          className="size-4 text-ink-soft"
                        />
                        <span className="truncate">{option.label}</span>
                        {current && (
                          <Check
                            aria-hidden
                            className="ml-auto size-4 shrink-0"
                          />
                        )}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
