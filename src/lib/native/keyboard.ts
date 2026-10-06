import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

const keyboard = () => import("@capacitor/keyboard");

let open = false;
let attached = false;
const listeners = new Set<() => void>();

const isIos = () => Capacitor.getPlatform() === "ios";

const setInset = (height: number) => {
  if (!isIos()) return;
  document.documentElement.style.setProperty(
    "--keyboard-inset",
    `${Math.max(0, Math.round(height))}px`,
  );
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

export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
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
