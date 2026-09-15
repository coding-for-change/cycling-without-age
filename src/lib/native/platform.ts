import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export type Unsubscribe = () => void;

export const NOOP: Unsubscribe = () => {};

export const isNative = () => Capacitor.isNativePlatform();

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
