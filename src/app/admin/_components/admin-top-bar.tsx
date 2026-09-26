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
  menuLabel,
  bell,
}: {
  items: ResolvedNavItem[];
  scopes: ScopeChoice[];
  defaultScope: ScopeArg;
  locale: Locale;
  languageLabel: string;
  menuLabel: string;
  bell: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toggleSidebar } = useSidebar();

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
    <header className="flex min-h-16 shrink-0 items-center gap-2 px-4 pt-safe lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 size-9 md:hidden"
        aria-label={menuLabel}
        onClick={toggleSidebar}
      >
        <Menu className="size-5" />
      </Button>
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
      </div>
    </header>
  );
}
