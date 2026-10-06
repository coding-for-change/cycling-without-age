"use client";

import { useSyncExternalStore } from "react";
import { THEME_COOKIE, isTheme, type ResolvedTheme, type Theme } from ".";

const ONE_YEAR = 60 * 60 * 24 * 365;
const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
  return () => observer.disconnect();
}

const readTheme = (): Theme => {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "system";
};

const readResolved = (): ResolvedTheme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

export const useTheme = () =>
  useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

export const useResolvedTheme = () =>
  useSyncExternalStore(subscribe, readResolved, () => "light" as ResolvedTheme);

function apply(theme: Theme) {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  root.dataset.theme = theme;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduced) {
    apply(theme);
    return;
  }
  document.documentElement.dataset.themeSwitch = "";
  document
    .startViewTransition(() => apply(theme))
    .finished.finally(
      () => delete document.documentElement.dataset.themeSwitch,
    );
}
