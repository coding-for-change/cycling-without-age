import { Capacitor } from "@capacitor/core";

export type BackButtonEvent = { canGoBack: boolean };


const app = () => import("@capacitor/app");

import { NOOP, subscribe, type Unsubscribe } from "./platform";
export { isNative } from "./platform";

export function onBackButton(handler: (event: BackButtonEvent) => void): Unsubscribe {
  if (!Capacitor.isNativePlatform()) return NOOP;
  return subscribe(async () =>
    (await app()).App.addListener("backButton", ({ canGoBack }) =>
      handler({ canGoBack }),
    ),
  );
}

export async function minimizeApp(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await (await app()).App.minimizeApp();
  } catch {}
}

export async function exitApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await (await app()).App.exitApp();
  } catch {}
}
