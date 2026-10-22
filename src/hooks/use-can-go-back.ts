"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Stamped = { cwaDepth?: number } | null;

let replacing = false;

export function markReplace() {
  replacing = true;
}

export function backDepth(state: Stamped, previous: number, replaced = false) {
  if (typeof state?.cwaDepth === "number") return state.cwaDepth;
  return replaced ? Math.max(previous, 0) : previous + 1;
}

export function useCanGoBack() {
  const pathname = usePathname();
  const depth = useRef(-1);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const state = window.history.state as Stamped;
    depth.current = backDepth(state, depth.current, replacing);
    replacing = false;
    if (state?.cwaDepth !== depth.current) {
      window.history.replaceState({ ...state, cwaDepth: depth.current }, "");
    }
    setCanGoBack(depth.current > 0);
  }, [pathname]);

  return canGoBack;
}
