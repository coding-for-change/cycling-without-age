"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { minimizeApp, onBackButton } from "@/lib/native/app";
import { decideBack } from "@/lib/native/back-policy";

const OVERLAY =
  '[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [data-vaul-drawer][data-state="open"]';

/** Radix and vaul both dismiss on Escape, so one synthetic key closes the top layer. */
const dismissOverlay = () =>
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );

/** The stamp `useCanGoBack` writes; anything unstamped is the first entry. */
const historyDepth = () => {
  const state = window.history.state as { cwaDepth?: number } | null;
  return typeof state?.cwaDepth === "number" ? state.cwaDepth : 0;
};

/**
 * The single owner of the Android hardware back button, mounted in the root
 * layout so it covers the flow, the admin shell and the member shell. The
 * listener subscribes once; the live pathname reaches it through a ref rather
 * than re-registering the plugin listener on every navigation.
 */
export function NativeBackHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const current = useRef(pathname);

  useEffect(() => {
    current.current = pathname;
  }, [pathname]);

  useEffect(
    () =>
      onBackButton(() => {
        const decision = decideBack({
          overlayOpen: Boolean(document.querySelector(OVERLAY)),
          depth: historyDepth(),
          pathname: current.current,
        });

        if (decision === "close-overlay") dismissOverlay();
        else if (decision === "back") router.back();
        else if (decision === "minimize") void minimizeApp();
        else router.replace(decision.href);
      }),
    [router],
  );

  return null;
}
