"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { LanguagePicker } from "@/components/language-picker";
import { ThemePicker, type ThemeStrings } from "@/components/theme-picker";
import { AvatarButton } from "@/components/account/avatar-button";
import type { AccountData } from "@/components/account/types";
import { useEdgeSwipe } from "@/hooks/use-edge-swipe";
import { useScrolled } from "@/hooks/use-scrolled";
import type { Locale } from "@/lib/i18n";
import type { ScopeArg } from "@/lib/commands";
import type { ResolvedNavItem } from "../nav";
import type { ScopeChoice } from "../scopes";
import { readScopeArg } from "./scope-url";
import { matchesPath } from "@/lib/nav-match";

export function AdminTopBar({
  items,
  scopes,
  defaultScope,
  locale,
  languageLabel,
  themeStrings,
  menuLabel,
  account,
  accountStrings,
  bell,
}: {
  items: ResolvedNavItem[];
  scopes: ScopeChoice[];
  defaultScope: ScopeArg;
  locale: Locale;
  languageLabel: string;
  themeStrings: ThemeStrings;
  menuLabel: string;
  account: AccountData | null;
  accountStrings: { account: string; switchHint: string };
  bell: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toggleSidebar, isMobile, openMobile, setOpenMobile } = useSidebar();
  const scrolled = useScrolled();

  useEdgeSwipe(() => setOpenMobile(true), isMobile && !openMobile);

  const activeScope = readScopeArg(
    searchParams,
    scopes.map((s) => s.arg),
    defaultScope,
  );
  const scopeLabel = scopes.find((s) => s.arg === activeScope)?.label;

  const section =
    items.find(
      (item) => item.href !== "/admin" && matchesPath(pathname, item.href),
    ) ?? items.find((item) => item.href === "/admin");

  return (
    <header
      data-slot="admin-top-bar"
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-1 border-b border-transparent bg-canvas/70 px-4 pt-safe backdrop-blur-md transition-colors duration-200 data-scrolled:border-line motion-reduce:transition-none md:relative md:gap-2 md:border-b-0 md:bg-transparent md:backdrop-blur-none lg:px-6"
    >
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 size-11 md:hidden"
        aria-label={menuLabel}
        onClick={toggleSidebar}
      >
        <Menu className="size-5" />
      </Button>
      {account ? (
        <AvatarButton
          data={account}
          activePerspective="admin"
          strings={accountStrings}
          className="md:hidden"
        />
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 truncate px-28 text-center font-semibold md:hidden"
      >
        {section?.label}
      </span>
      <SidebarTrigger className="-ml-1 hidden md:flex" />
      <Separator
        orientation="vertical"
        className="mr-2 hidden bg-line data-[orientation=vertical]:h-4 md:block"
      />
      <Breadcrumb>
        <BreadcrumbList>
          {scopeLabel && (
            <>
              <BreadcrumbItem className="hidden md:block">
                <span className="text-ink-soft">{scopeLabel}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
            </>
          )}
          <BreadcrumbItem className="hidden md:inline-flex">
            <BreadcrumbPage>{section?.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        {bell}
        <LanguagePicker
          locale={locale}
          label={languageLabel}
          className="hidden h-9 px-3 md:inline-flex"
        />
        <ThemePicker
          strings={themeStrings}
          className="hidden h-9 px-3 md:inline-flex"
        />
      </div>
    </header>
  );
}
