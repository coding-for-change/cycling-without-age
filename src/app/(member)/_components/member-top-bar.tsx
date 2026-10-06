"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguagePicker } from "@/components/language-picker";
import type { AccountData } from "@/components/account/types";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  activeItem,
  isConversationPath,
  type MemberPerspective,
  type ResolvedMemberNavItem,
} from "../nav";
import { AvatarButton } from "./avatar-button";
import { SignInLink } from "./sign-in-link";

const subscribeScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};

const useScrolled = () =>
  useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 0,
    () => false,
  );

export function MemberTopBar({
  items,
  account,
  activePerspective,
  strings,
  signIn,
  locale,
  languageLabel,
  bell,
}: {
  items: ResolvedMemberNavItem[];
  account: AccountData | null;
  activePerspective: MemberPerspective;
  strings: { account: string; switchHint: string };
  signIn: { href: string; label: string };
  locale: Locale;
  languageLabel: string;
  bell: ReactNode;
}) {
  const pathname = usePathname();
  const title = activeItem(pathname, items)?.label;
  const scrolled = useScrolled();

  return (
    <header
      data-slot="member-top-bar"
      data-scrolled={scrolled || undefined}
      className={cn(
        "sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-2 border-b border-transparent bg-canvas/70 px-4 pt-safe backdrop-blur-md transition-colors duration-200 data-scrolled:border-line motion-reduce:transition-none md:relative md:border-b-0 md:bg-transparent md:backdrop-blur-none lg:px-6",
        isConversationPath(pathname) && "hidden md:flex",
      )}
    >
      {account ? (
        <AvatarButton
          data={account}
          activePerspective={activePerspective}
          strings={strings}
          className="-ml-1 md:hidden"
        />
      ) : (
        <SignInLink
          href={signIn.href}
          label={signIn.label}
          className="md:hidden"
        />
      )}

      <SidebarTrigger className="-ml-1 hidden md:flex" />
      <Separator
        orientation="vertical"
        className="mr-2 hidden bg-line data-[orientation=vertical]:h-4 md:block"
      />

      {/* The page's own h1 announces the section; this is the same word drawn
          where a phone expects it, so it is decoration. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 truncate px-16 text-center font-semibold md:hidden"
      >
        {title}
      </span>

      <Breadcrumb className="hidden md:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
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
