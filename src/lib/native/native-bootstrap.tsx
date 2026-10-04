"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { brand } from "@/lib/brand";
import { hideKeyboardAccessoryBar } from "./keyboard";
import { configureNativeNavigation } from "./navigation";
import { nativePlatform } from "./platform";

const UA_TRANSITION_BACKSTOP_MS = 5000;

function hasNativeSwipePreview(event: PopStateEvent) {
  return "hasUAVisualTransition" in event ? event.hasUAVisualTransition : true;
}

function suppressViewTransitionsOnSwipeBack() {
  const root = document.documentElement;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const release = () => {
    clearTimeout(timer);
    delete root.dataset.uaTransition;
  };

  const onPopState = (event: PopStateEvent) => {
    if (!hasNativeSwipePreview(event)) return;
    root.dataset.uaTransition = "";
    clearTimeout(timer);
    timer = setTimeout(release, UA_TRANSITION_BACKSTOP_MS);
  };

  window.addEventListener("popstate", onPopState);
  window.addEventListener("pointerdown", release, { capture: true });
  return () => {
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener("pointerdown", release, { capture: true });
    release();
  };
}

export function NativeBootstrap() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(() => {});
    }
    if (nativePlatform() !== "ios") return;
    document.documentElement.dataset.shell = "ios";
    hideKeyboardAccessoryBar();
    void configureNativeNavigation({
      contentInsetMode: "css",
      colors: { tint: brand.mintDeep },
      glass: { effect: "liquidGlass" },
    });
    return suppressViewTransitionsOnSwipeBack();
  }, []);
  return null;
}
