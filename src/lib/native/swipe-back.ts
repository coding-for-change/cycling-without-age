import { registerPlugin } from "@capacitor/core";
import { nativePlatform } from "./platform";

type SwipeBackPlugin = {
  setEnabled(options: { enabled: boolean }): Promise<void>;
};

const SwipeBack = registerPlugin<SwipeBackPlugin>("SwipeBack");

export async function setSwipeBackEnabled(enabled: boolean): Promise<void> {
  if (nativePlatform() !== "ios") return;
  try {
    await SwipeBack.setEnabled({ enabled });
  } catch {}
}

export const isSettlingFromSwipeBack = (): boolean =>
  typeof document !== "undefined" &&
  document.documentElement.dataset.uaTransition !== undefined;
