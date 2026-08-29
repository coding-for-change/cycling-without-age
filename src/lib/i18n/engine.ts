"use client";

/* i18n engine — the TS port of the vanilla mockup's CWA.reg / CWA.t / CWA.fmt.
   Dictionaries are flat key → string maps per language; page modules register
   their own namespaced keys at module scope via reg(). Components subscribe to
   the language through useI18n() so they re-render on switch. */

import { create } from "zustand";

export type Lang = "en" | "de" | "da";
export type Dict = Record<Lang, Record<string, string>>;

export const LANGS: { code: Lang; flag: string; name: string }[] = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "da", flag: "🇩🇰", name: "Dansk" },
];

const dict: Dict = { en: {}, de: {}, da: {} };

/** Register a dictionary. Call at module scope of the page that owns the keys. */
export function reg(langs: Partial<Dict>) {
  for (const l of Object.keys(langs) as Lang[]) {
    Object.assign(dict[l], langs[l]);
  }
}

const LANG_KEY = "cwa.lang";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

/** Language selection — read from localStorage after mount (see I18nBoot). */
export const useLangStore = create<LangState>()((set) => ({
  lang: "en",
  setLang: (l) => {
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
    document.documentElement.lang = l;
    set({ lang: l });
  },
}));

export function bootLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved && dict[saved]) useLangStore.setState({ lang: saved });
    document.documentElement.lang = saved || "en";
  } catch {}
}

/** Translate, non-reactive (safe anywhere): lang → en → key fallback. */
export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const lang = useLangStore.getState().lang;
  let s = dict[lang][key];
  if (s === undefined) s = dict.en[key];
  if (s === undefined) s = key;
  if (params) {
    for (const k of Object.keys(params))
      s = s.split(`{${k}}`).join(String(params[k]));
  }
  return s;
}

const LOCALES: Record<Lang, string> = { en: "en-GB", de: "de-DE", da: "da-DK" };

function loc(): string {
  return LOCALES[useLangStore.getState().lang];
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* Date / number formatting via Intl — locale-aware, no translation keys needed. */
export const fmt = {
  time: (ts: number) =>
    new Intl.DateTimeFormat(loc(), {
      hour: "2-digit",
      minute: "2-digit",
    }).format(ts),
  date: (ts: number) =>
    new Intl.DateTimeFormat(loc(), { day: "numeric", month: "short" }).format(
      ts,
    ),
  dateLong: (ts: number) =>
    new Intl.DateTimeFormat(loc(), {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(ts),
  weekday: (ts: number) =>
    new Intl.DateTimeFormat(loc(), { weekday: "short" }).format(ts),
  monthShort: (ts: number) =>
    new Intl.DateTimeFormat(loc(), { month: "short" }).format(ts),
  euro: (n: number) =>
    new Intl.NumberFormat(loc(), {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n),
  num: (n: number) => new Intl.NumberFormat(loc()).format(n),

  /** "Today" / "Tomorrow" / "Friday, 21 August" */
  day(ts: number): string {
    const diff = Math.round((startOfDay(ts) - startOfDay(Date.now())) / 864e5);
    if (diff === 0) return t("common.today");
    if (diff === 1) return t("common.tomorrow");
    return this.dateLong(ts);
  },
  dayTime(ts: number): string {
    return `${this.day(ts)} · ${this.time(ts)}`;
  },

  /** canonical ride time display: "Tomorrow · Morning" / "Today · 14:30" */
  rideWhen(ride: { ts: number; slot?: string }): string {
    const timePart =
      !ride.slot || ride.slot === "exact"
        ? this.time(ride.ts)
        : t(`slot.${ride.slot}`);
    return `${this.day(ride.ts)} · ${timePart}`;
  },

  /** relative: "in 3 h 40 min" / "25 min ago" */
  rel(ts: number): string {
    const d = ts - Date.now();
    const abs = Math.abs(d);
    const min = Math.round(abs / 6e4);
    const h = Math.floor(min / 60);
    const m = min % 60;
    const days = Math.round(abs / 864e5);
    if (d >= 0) {
      if (min < 60) return t("rel.inMin", { m: min });
      if (min < 60 * 24) return t("rel.inHM", { h, m });
      return t("rel.inD", { d: days });
    }
    if (min < 60) return t("rel.agoMin", { m: min });
    if (min < 60 * 24) return t("rel.agoH", { h });
    return t("rel.agoD", { d: days });
  },
};

/** Reactive hook: subscribes to the language so the component re-renders on
 *  switch, and hands back the shared t/fmt. */
export function useI18n() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  return { lang, setLang, t, fmt };
}
