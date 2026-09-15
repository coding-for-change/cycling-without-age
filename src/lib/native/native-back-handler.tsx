"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { minimizeApp, onBackButton } from "@/lib/native/app";
import { decideBack } from "@/lib/native/back-policy";

const OVERLAY =
  '[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [data-vaul-drawer][data-state="open"]';

const dismissOverlay = () =>
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );

const historyDepth = () => {
  const state = window.history.state as { cwaDepth?: number } | null;
  return typeof state?.cwaDepth === "number" ? state.cwaDepth : 0;
};

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
