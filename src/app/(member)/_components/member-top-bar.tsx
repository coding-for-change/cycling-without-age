"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguagePicker } from "@/components/language-picker";
import { ThemePicker, type ThemeStrings } from "@/components/theme-picker";
import type { AccountData } from "@/components/account/types";
import { formatLongDateWithWeekday, toIsoDateLocal } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import {
  accountPage,
  activeItem,
  isConversationPath,
  isDrillDown,
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

const subscribeMinute = (onChange: () => void) => {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
};

/** The device's own clock, read after hydration — the server has no idea. */
const useLocalNow = () => {
  const hour = useSyncExternalStore(
    subscribeMinute,
    () => new Date().getHours(),
    () => null,
  );
  const day = useSyncExternalStore(
    subscribeMinute,
    () => toIsoDateLocal(new Date()),
    () => null,
  );
  return { hour, day };
};

type Greetings = { morning: string; afternoon: string; evening: string };

const greetingFor = (hour: number, greetings: Greetings) =>
  hour < 12
    ? greetings.morning
    : hour < 18
      ? greetings.afternoon
      : greetings.evening;

export type PassengerTopBar = {
  greetings: Greetings;
  name: string | null;
  back: string;
};

export function MemberTopBar({
  items,
  account,
  activePerspective,
  strings,
  signIn,
  locale,
  languageLabel,
  themeStrings,
  bell,
  passenger = null,
}: {
  items: ResolvedMemberNavItem[];
  account: AccountData | null;
  activePerspective: MemberPerspective;
  strings: { account: string; switchHint: string };
  signIn: { href: string; label: string };
  locale: Locale;
  languageLabel: string;
  themeStrings: ThemeStrings;
  bell: ReactNode;
  /** Mockup 2's header on a phone: left-aligned, a greeting at home, a back knob below a tab. */
  passenger?: PassengerTopBar | null;
}) {
  const pathname = usePathname();
  const item = activeItem(pathname, items);
  const title = item?.label;
  const scrolled = useScrolled();
  const { hour, day } = useLocalNow();
  const drill = passenger !== null && isDrillDown(pathname, items);
  const atHome = passenger !== null && !drill && item?.key === "home";
  const words = account?.language ?? locale;
  const heading =
    atHome && passenger.name && hour !== null
      ? formatMessage(
          greetingFor(hour, passenger.greetings),
          { name: passenger.name },
          words,
        )
      : title;
  const sub =
    atHome && account && day
      ? formatLongDateWithWeekday(day, account.notation)
      : null;

  return (
    <header
      data-slot="member-top-bar"
      data-scrolled={scrolled || undefined}
      className={cn(
        "sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-2 border-b border-transparent bg-canvas/70 px-4 pt-safe backdrop-blur-md transition-colors duration-200 data-scrolled:border-line motion-reduce:transition-none md:relative md:border-b-0 md:bg-transparent md:backdrop-blur-none lg:px-6",
        isConversationPath(pathname) && "hidden md:flex",
      )}
    >
      {drill && item ? (
        <Link
          href={item.href}
          transitionTypes={["pop"]}
          aria-label={passenger.back}
          className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper shadow-soft outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95 motion-reduce:transition-none md:hidden"
        >
          <ArrowLeft
            aria-hidden
            className="size-5"
          />
        </Link>
      ) : account ? (
        <AvatarButton
          data={account}
          activePerspective={activePerspective}
          strings={strings}
          href={accountPage(activePerspective)}
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
      {passenger ? (
        <span
          aria-hidden
          className="flex min-w-0 flex-1 flex-col md:hidden"
        >
          <span className="truncate font-display text-lg leading-tight font-bold">
            {heading}
          </span>
          {sub ? (
            <span className="truncate text-xs text-ink-soft">{sub}</span>
          ) : null}
        </span>
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 truncate px-16 text-center font-semibold md:hidden"
        >
          {title}
        </span>
      )}

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
        <ThemePicker
          strings={themeStrings}
          className="hidden h-9 px-3 md:inline-flex"
        />
      </div>
    </header>
  );
}
