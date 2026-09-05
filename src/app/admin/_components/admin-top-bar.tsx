"use client";

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

/**
 * The scope half of the breadcrumb comes from the URL, not from the server: a
 * Layout cannot read `searchParams`, so a label resolved server-side would keep
 * saying "München" after someone widened to the whole country.
 *
 * `pt` carries the notch — the WebView in the Capacitor shell draws under it,
 * and this bar is the topmost thing on the page.
 */
export function AdminTopBar({
  items,
  scopes,
  defaultScope,
  locale,
  languageLabel,
}: {
  items: ResolvedNavItem[];
  scopes: ScopeChoice[];
  defaultScope: ScopeArg;
  locale: Locale;
  languageLabel: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeScope = readScopeArg(
    new URLSearchParams(searchParams.toString()),
    scopes.map((s) => s.arg),
    defaultScope,
  );
  const scopeLabel = scopes.find((s) => s.arg === activeScope)?.label;

  const section =
    items.find(
      (item) =>
        item.href !== "/admin" &&
        (pathname === item.href || pathname.startsWith(`${item.href}/`)),
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
      <LanguagePicker
        locale={locale}
        label={languageLabel}
        className="ml-auto h-9 px-3"
      />
    </header>
  );
}
