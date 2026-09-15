"use client";

import Link from "next/link";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ICONS } from "@/components/icons";
import type { Perspective } from "@/lib/access";
import type { PerspectiveChoice } from "@/lib/perspectives";

export function PerspectiveSwitcher({
  perspectives,
  activePerspective,
  label,
  subtitle,
  strings,
}: {
  perspectives: PerspectiveChoice[];
  activePerspective: Perspective;
  label: string;
  subtitle: string;
  strings: { switchLabel: string; label: string };
}) {
  const ActiveIcon = ICONS[activePerspective];

  const identity = (
    <>
      <span
        aria-hidden
        className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-mint text-ink"
      >
        <ActiveIcon className="size-4" />
      </span>
      <span className="grid flex-1 text-left leading-tight">
        <span className="truncate font-medium">{label}</span>
        <span className="truncate text-xs text-ink-soft">{subtitle}</span>
      </span>
    </>
  );

  if (perspectives.length < 2)
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
              className="data-[state=open]:bg-canvas-deeper"
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
            className="min-w-64 rounded-2xl border-line p-2"
          >
            <DropdownMenuLabel className="text-xs text-ink-soft">
              {strings.label}
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
                  <Link
                    href={option.href}
                    aria-current={current ? "true" : undefined}
                  >
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
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
