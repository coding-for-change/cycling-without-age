import { registerPlugin } from "@capacitor/core";
import { nativePlatform, NOOP, type Unsubscribe } from "./platform";

type ShellBackgroundPlugin = {
  set(options: { color: string; dark: boolean }): Promise<void>;
};

const ShellBackground = registerPlugin<ShellBackgroundPlugin>("ShellBackground");

const sync = () => {
  const root = document.documentElement;
  const color = getComputedStyle(root).getPropertyValue("--canvas").trim();
  if (!/^#[0-9a-f]{6}$/i.test(color)) return;
  ShellBackground.set({ color, dark: root.classList.contains("dark") }).catch(
    () => {},
  );
};

export function syncShellBackground(): Unsubscribe {
  if (nativePlatform() !== "ios") return NOOP;
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}
