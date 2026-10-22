import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

const keyboard = () => import("@capacitor/keyboard");

let open = false;
let inset = 0;
let attached = false;
const listeners = new Set<() => void>();

const isIos = () => Capacitor.getPlatform() === "ios";

const setInset = (height: number) => {
  if (!isIos()) return;
  inset = Math.max(0, Math.round(height));
  document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
  listeners.forEach((listener) => listener());
};

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
      void Keyboard.addListener("keyboardWillShow", ({ keyboardHeight }) => {
        setInset(keyboardHeight);
        set(true);
      }).catch(
        () => {
          attached = false;
        },
      );
      void Keyboard.addListener("keyboardWillHide", () => {
        setInset(0);
        set(false);
      }).catch(
        () => {
          attached = false;
        },
      );
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
const insetSnapshot = () => inset;
const serverInset = () => 0;

export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, insetSnapshot, serverInset);
}

let scrollLocks = 0;

const setScrollDisabled = (isDisabled: boolean) => {
  void keyboard()
    .then(({ Keyboard }) => Keyboard.setScroll({ isDisabled }))
    .catch(() => {});
};

export function lockWebViewScroll(): () => void {
  if (!Capacitor.isNativePlatform() || !isIos()) return () => {};
  if (scrollLocks++ === 0) setScrollDisabled(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--scrollLocks === 0) setScrollDisabled(false);
  };
}

export function hideKeyboardAccessoryBar() {
  if (!Capacitor.isNativePlatform() || !isIos()) return;
  void keyboard()
    .then(({ Keyboard }) => Keyboard.setAccessoryBarVisible({ isVisible: false }))
    .catch(() => {});
}
