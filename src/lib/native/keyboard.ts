import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

const keyboard = () => import("@capacitor/keyboard");

let open = false;
let attached = false;
const listeners = new Set<() => void>();

const set = (next: boolean) => {
  if (open === next) return;
  open = next;
  listeners.forEach((listener) => listener());
};

/**
 * Attached on the first subscriber and never removed: the flag is module state
 * shared by every hook instance, so the two plugin listeners outlive any single
 * component and cost one round trip for the life of the WebView.
 */
const attach = () => {
  if (attached || !Capacitor.isNativePlatform()) return;
  attached = true;
  void keyboard()
    .then(({ Keyboard }) => {
      void Keyboard.addListener("keyboardWillShow", () => set(true));
      void Keyboard.addListener("keyboardWillHide", () => set(false));
    })
    .catch(() => {
      attached = false;
    });
};

const subscribe = (onStoreChange: () => void): (() => void) => {
  attach();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
};

const snapshot = () => open;
const serverSnapshot = () => false;

/**
 * Whether the native keyboard covers the viewport. Always `false` on the web,
 * where the browser already shrinks the layout viewport for us.
 */
export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
