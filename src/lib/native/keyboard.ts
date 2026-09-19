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

export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
