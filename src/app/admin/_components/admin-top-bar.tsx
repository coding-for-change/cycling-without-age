"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  bell,
}: {
  items: ResolvedNavItem[];
  scopes: ScopeChoice[];
  defaultScope: ScopeArg;
  locale: Locale;
  languageLabel: string;
  bell: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    <header className="flex h-16 shrink-0 items-center gap-2 px-4 pt-[env(safe-area-inset-top)] lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 bg-line data-[orientation=vertical]:h-4"
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
          <BreadcrumbItem>
            <BreadcrumbPage>{section?.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        {bell}
        <LanguagePicker
          locale={locale}
          label={languageLabel}
          className="h-9 px-3"
        />
      </div>
    </header>
  );
}
