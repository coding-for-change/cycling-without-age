import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export type Unsubscribe = () => void;

export const NOOP: Unsubscribe = () => {};

export const isNative = () => Capacitor.isNativePlatform();

export type NativePlatform = "ios" | "android" | "web";

export const NATIVE_USER_AGENT = "CWA-Native";

export const nativePlatform = (): NativePlatform => {
  try {
    const platform = Capacitor.getPlatform();
    return platform === "ios" || platform === "android" ? platform : "web";
  } catch {
    return "web";
  }
};

export const isNativeShell = (): boolean =>
  typeof navigator !== "undefined" &&
  navigator.userAgent.includes(NATIVE_USER_AGENT);

export const subscribe = (
  open: () => Promise<PluginListenerHandle>,
): Unsubscribe => {
  let handle: PluginListenerHandle | null = null;
  let cancelled = false;

  open()
    .then((opened) => {
      handle = opened;
      if (cancelled) void handle.remove();
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    void handle?.remove();
    handle = null;
  };
};
