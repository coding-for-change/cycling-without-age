"use client";

/* Small shared building blocks: tiles, hero CTA, badges, progress, avatars,
   language menu, weather chip. Brand: text black/white only, red reserved. */

import { useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useI18n, LANGS } from "@/lib/i18n";
import { avatarTone, initials, weather } from "@/lib/art";
import type { RideStatus, RideType } from "@/lib/types";
import { Icon } from "./Icon";

/* ---- flat colour block — the signature element ---- */
export type TileTone =
  "mint" | "mint-solid" | "grey" | "red" | "deep" | "ink" | "paper";

export function Tile({
  tone = "paper",
  className,
  children,
  onClick,
  style,
}: {
  tone?: TileTone;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const cls = cn("tile", `tile-${tone}`, className);
  if (onClick)
    return (
      <button
        type="button"
        className={cls}
        onClick={onClick}
        style={style}
      >
        {children}
      </button>
    );
  return (
    <div
      className={cls}
      style={style}
    >
      {children}
    </div>
  );
}

/* ---- the signature CTA: label + circular knob. Red = THE action. ---- */
export function BtnHero({
  label,
  sub,
  icon = "arrowRight",
  tone,
  className,
  ...rest
}: {
  label: ReactNode;
  sub?: ReactNode;
  icon?: string;
  tone?: "ink" | "deep";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("btn-hero", tone && `on-${tone}`, className)}
      {...rest}
    >
      <span className="grow">
        {label}
        {sub && <span className="btn-hero-sub">{sub}</span>}
      </span>
      <span className="btn-hero-knob">
        <Icon name={icon} />
      </span>
    </button>
  );
}

export function IconPill({
  icon,
  onInk,
  className,
  ...rest
}: {
  icon: string;
  onInk?: boolean;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn("icon-pill", onInk && "on-ink", className)}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

/* ---- badges: statuses live on the mint/grey/red/black axis only ---- */
const STATUS_BADGE: Record<RideStatus, string> = {
  requested: "badge-grey",
  open: "badge-red",
  staffed: "badge-mint",
  in_progress: "badge-deep",
  done: "badge-muted",
  cancelled: "badge-outline",
};

export function StatusBadge({ status }: { status: RideStatus }) {
  const { t } = useI18n();
  return (
    <span className={cn("badge", STATUS_BADGE[status] || "badge-muted")}>
      {t(`status.${status}`)}
    </span>
  );
}

const TYPE_ICONS: Record<RideType, string> = {
  pleasure: "heart",
  functional: "route",
  event: "users",
};

export function TypeBadge({ type }: { type: RideType }) {
  const { t } = useI18n();
  return (
    <span className="badge badge-outline">
      <Icon name={TYPE_ICONS[type] || "bike"} />
      {t(`type.${type}`)}
    </span>
  );
}

export function BatteryBar({ pct }: { pct: number }) {
  const cls = pct < 25 ? "critical" : pct < 45 ? "low" : "";
  return (
    <span className="battery">
      <span className="battery-bar">
        <span
          className={cn("battery-fill", cls)}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-xs tabular-nums">{pct}%</span>
    </span>
  );
}

/* ---- circular progress ring (training completion, seats filled…) ---- */
export function Ring({
  pct,
  label,
  tone = "mint",
}: {
  pct: number;
  label: string;
  tone?: "mint" | "deep" | "red";
}) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const stroke =
    tone === "deep"
      ? "var(--mint-deep)"
      : tone === "red"
        ? "var(--red)"
        : "var(--mint)";
  return (
    <div className="ring">
      <svg viewBox="0 0 72 72">
        <circle
          className="ring-track"
          cx="36"
          cy="36"
          r={r}
        />
        <circle
          className="ring-fill"
          cx="36"
          cy="36"
          r={r}
          stroke={stroke}
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={off.toFixed(1)}
        />
      </svg>
      <span className="ring-label">{label}</span>
    </div>
  );
}

/* ---- segmented control ---- */
export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cn(o.value === value && "active")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---- deterministic per-person avatar ---- */
export function Avatar({
  name,
  size,
  className,
}: {
  name: string;
  size?: "sm" | "lg" | "xl";
  className?: string;
}) {
  const tone = avatarTone(name);
  return (
    <span
      className={cn("av", size && `av-${size}`, className)}
      style={{ background: tone.bg, color: tone.fg }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  names,
  max = 4,
}: {
  names: string[];
  max?: number;
}) {
  const shown = names.slice(0, max);
  return (
    <div className="av-stack">
      {shown.map((n, i) => (
        <Avatar
          key={`${n}-${i}`}
          name={n}
        />
      ))}
      {names.length > max && (
        <span className="av-more">+{names.length - max}</span>
      )}
    </div>
  );
}

/* ---- language switcher: flag trigger + dropdown, top-right of its screen ---- */
export function LangMenu({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const cur = LANGS.find((l) => l.code === lang) || LANGS[0];
  return (
    <div className={cn("relative flex-none", className)}>
      <button
        type="button"
        className="btn btn-outline btn-sm gap-1.5"
        aria-haspopup="listbox"
        aria-label={t("common.language")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base leading-none">{cur.flag}</span>
        <span>{cur.code.toUpperCase()}</span>
        <Icon
          name="chevronDown"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-50 mt-2 flex w-44 flex-col gap-0.5 rounded-2xl border border-line bg-paper p-1.5 shadow-[var(--shadow-lift)]"
            role="listbox"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={l.code === lang}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-semibold hover:bg-grey-tint",
                  l.code === lang && "font-bold",
                )}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="flex-1">{l.name}</span>
                {l.code === lang && (
                  <Icon
                    name="check"
                    size={15}
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---- stable mock weather chip ---- */
export function WeatherChip({ ts }: { ts: number }) {
  const { t } = useI18n();
  const w = weather(ts);
  return (
    <span className="weather">
      <Icon name={w.icon} />
      <span>
        {w.deg}° · {t(w.tKey)}
      </span>
    </span>
  );
}

/* ---- staggered mount reveal helper: <div {...rev(3)}> ---- */
export function rev(i: number): {
  className: string;
  style: React.CSSProperties;
} {
  return { className: "reveal", style: { ["--i" as string]: i } };
}
