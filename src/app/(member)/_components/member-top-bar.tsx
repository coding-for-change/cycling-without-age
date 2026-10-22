"use client";

import { Fragment, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguagePicker } from "@/components/language-picker";
import { ThemePicker, type ThemeStrings } from "@/components/theme-picker";
import type { AccountData } from "@/components/account/types";
import { markReplace, useCanGoBack } from "@/hooks/use-can-go-back";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  activeItem,
  isConversationPath,
  isDrillDown,
  parentItem,
  type MemberPerspective,
  type ResolvedMemberNavItem,
} from "../nav";
import { AvatarButton } from "./avatar-button";
import { usePageTitle } from "./member-title";
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
  backLabel,
  signIn,
  locale,
  languageLabel,
  themeStrings,
  bell,
}: {
  items: ResolvedMemberNavItem[];
  account: AccountData | null;
  activePerspective: MemberPerspective;
  strings: { account: string; switchHint: string };
  backLabel: string;
  signIn: { href: string; label: string };
  locale: Locale;
  languageLabel: string;
  themeStrings: ThemeStrings;
  bell: ReactNode;
}) {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const pageTitle = usePageTitle();
  const canGoBack = useCanGoBack();
  const item = activeItem(pathname, items);
  const parent = isDrillDown(pathname, items)
    ? parentItem(pathname, items)
    : null;
  const current =
    pageTitle ?? (item && item.href !== parent?.href ? item.label : null);
  const title = current ?? item?.label;

  return (
    <header
      data-slot="member-top-bar"
      data-scrolled={scrolled || undefined}
      className={cn(
        "sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-2 border-b border-transparent bg-canvas/70 px-4 pt-safe backdrop-blur-md transition-colors duration-200 data-scrolled:border-line motion-reduce:transition-none md:relative md:border-b-0 md:bg-transparent md:backdrop-blur-none lg:px-6",
        isConversationPath(pathname) && "hidden md:flex",
      )}
    >
      {parent ? (
        <BackButton
          parentHref={parent.href}
          canGoBack={canGoBack}
          label={backLabel}
          className="-ml-2 md:hidden"
        />
      ) : account ? (
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

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 truncate px-16 text-center font-semibold md:hidden"
      >
        {title}
      </span>

      {parent ? (
        <BackButton
          parentHref={parent.href}
          canGoBack={canGoBack}
          label={backLabel}
          className="-ml-2 hidden size-9 md:flex"
        />
      ) : null}

      <Breadcrumb className="hidden min-w-0 md:block">
        <BreadcrumbList className="flex-nowrap">
          {parent && current ? (
            <Fragment>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href={parent.href}
                    transitionTypes={["pop"]}
                  >
                    {parent.label}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ) : null}
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
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

function BackButton({
  parentHref,
  canGoBack,
  label,
  className,
}: {
  parentHref: string;
  canGoBack: boolean;
  label: string;
  className?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    if (canGoBack) return router.back();
    markReplace();
    router.replace(parentHref, { transitionTypes: ["pop"] });
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-canvas-deep focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none",
        className,
      )}
    >
      <ChevronLeft
        aria-hidden
        className="size-6"
        strokeWidth={2.25}
      />
    </button>
  );
}
