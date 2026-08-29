"use client";

/* App chrome for the two mobile apps: hero header (a person, not a page name),
   back header, brand marks, notification bell, floating tab dock, section heads. */

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Icon } from "./Icon";

/** Header shadow appears only once the page has scrolled. */
function useStickyHead() {
  useEffect(() => {
    const onScroll = () => {
      document
        .querySelectorAll(".hero-head")
        .forEach((h) => h.classList.toggle("stuck", window.scrollY > 4));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

/** The app-root header: identity on the left, live actions on the right. */
export function HeroHead({
  lead,
  title,
  sub,
  right,
}: {
  lead?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  useStickyHead();
  return (
    <header className="hero-head">
      {lead}
      <div className="min-w-0 flex-1">
        {title && <div className="hero-head-title truncate">{title}</div>}
        {sub && <div className="hero-head-sub truncate">{sub}</div>}
      </div>
      {right}
    </header>
  );
}

/** Detail-page header: a back knob, no chrome; the title lives in the page body. */
export function BackHead({
  back,
  onBack,
  title,
  sub,
  right,
}: {
  back?: string;
  onBack?: () => void;
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  useStickyHead();
  const router = useRouter();
  const { t } = useI18n();
  return (
    <header className="hero-head">
      <button
        type="button"
        className="icon-pill"
        aria-label={t("common.back")}
        onClick={() =>
          onBack ? onBack() : back ? router.push(back) : router.back()
        }
      >
        <Icon name="arrowLeft" />
      </button>
      <div className="min-w-0 flex-1">
        {title && <div className="hero-head-title truncate">{title}</div>}
        {sub && <div className="hero-head-sub truncate">{sub}</div>}
      </div>
      {right}
    </header>
  );
}

/** The logo on a white plate ringed in mint. */
export function BrandDot() {
  return (
    <div className="brand-dot">
      <Image
        src="/logo.png"
        alt=""
        width={36}
        height={32}
      />
    </div>
  );
}

/** Logo + wordmark, for splash/login screens. */
export function BrandLockup() {
  const { t } = useI18n();
  return (
    <div className="brand-lockup">
      <Image
        src="/logo.png"
        alt=""
        width={40}
        height={36}
      />
      <span>{t("brand")}</span>
    </div>
  );
}

export function BellButton({
  hasNew,
  onClick,
}: {
  hasNew?: boolean;
  onClick?: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="bell"
      aria-label={t("common.notifications")}
      onClick={onClick}
    >
      <Icon name="bell" />
      {hasNew && <span className="bell-dot pinging" />}
    </button>
  );
}

export interface TabDef {
  href: string;
  icon: string;
  labelKey: string;
  dot?: boolean;
  /** exact match only (the app root tab) */
  exact?: boolean;
}

/** Floating pill dock. Active tab = the black pill. */
export function TabBar({ tabs }: { tabs: TabDef[] }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="tabbar">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(active && "active")}
          >
            {tab.dot && <span className="tab-dot" />}
            <Icon name={tab.icon} />
            <span>{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SectionHead({
  title,
  linkText,
  href,
  onLink,
}: {
  title: ReactNode;
  linkText?: string;
  href?: string;
  onLink?: () => void;
}) {
  const router = useRouter();
  return (
    <div className="section-head">
      <h2 className="h2">{title}</h2>
      {linkText && (
        <button
          type="button"
          className="link"
          onClick={() => (onLink ? onLink() : href && router.push(href))}
        >
          {linkText}
          <Icon name="chevronRight" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon = "sparkles",
  text,
  cta,
}: {
  icon?: string;
  text: ReactNode;
  cta?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="icon-tile">
        <Icon name={icon} />
      </span>
      <p className="text-sm">{text}</p>
      {cta}
    </div>
  );
}
