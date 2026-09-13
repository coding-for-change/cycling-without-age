import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export type BackButtonEvent = { canGoBack: boolean };
export type Unsubscribe = () => void;

const NOOP: Unsubscribe = () => {};

const app = () => import("@capacitor/app");

/**
 * `addListener` resolves a round trip later. An effect that unmounts before
 * that would never see the handle, so the unsubscribe closes over a flag and
 * the promise removes the handle it just received.
 */
const subscribe = (open: () => Promise<PluginListenerHandle>): Unsubscribe => {
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

export { isNative } from "./platform";

/**
 * Registering a `backButton` listener switches Android's own back handling off,
 * so whoever subscribes owns every case — see `back-policy.ts`. Exactly one
 * subscriber exists (`<NativeBackHandler />` in the root layout).
 */
export function onBackButton(handler: (event: BackButtonEvent) => void): Unsubscribe {
  if (!Capacitor.isNativePlatform()) return NOOP;
  return subscribe(async () =>
    (await app()).App.addListener("backButton", ({ canGoBack }) =>
      handler({ canGoBack }),
    ),
  );
}

/** Sends the app to the background and keeps it warm. Android only; no-op elsewhere. */
export async function minimizeApp(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await (await app()).App.minimizeApp();
  } catch {
    // Losing a back press is better than crashing the shell.
  }
}

/** Kills the process. Nothing in the app calls this today — minimize instead. */
export async function exitApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await (await app()).App.exitApp();
  } catch {
    // Same: never throw out of a back press.
  }
}
