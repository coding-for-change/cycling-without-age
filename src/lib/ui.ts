"use client";

/* Ephemeral UI state: toasts (confirm the user's OWN action) and OS-style push
   banners (announce INCOMING events). Rendered by <NotificationRegion/>. */

import { create } from "zustand";

export interface Toast {
  id: number;
  msg: string;
  type: "success" | "info" | "error";
}

export interface Banner {
  id: number;
  title: string;
  body: string;
  href: string;
  icon?: string;
  appName?: string;
}

interface UiState {
  toasts: Toast[];
  banners: Banner[];
  dismissToast: (id: number) => void;
  dismissBanner: (id: number) => void;
}

let seq = 0;

export const useUi = create<UiState>()((set) => ({
  toasts: [],
  banners: [],
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  dismissBanner: (id) =>
    set((s) => ({ banners: s.banners.filter((b) => b.id !== id) })),
}));

export function toast(msg: string, type: Toast["type"] = "success") {
  const id = ++seq;
  useUi.setState((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));
  setTimeout(() => useUi.getState().dismissToast(id), 3400);
}

export function pushBanner(b: Omit<Banner, "id">) {
  const id = ++seq;
  useUi.setState((s) => ({ banners: [...s.banners, { ...b, id }] }));
  setTimeout(() => useUi.getState().dismissBanner(id), 6500);
  try {
    if (navigator.vibrate) navigator.vibrate(10);
  } catch {}
}
