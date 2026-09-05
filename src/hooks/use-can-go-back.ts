"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Stamped = { cwaDepth?: number } | null;

export function backDepth(state: Stamped, previous: number) {
  return typeof state?.cwaDepth === "number" ? state.cwaDepth : previous + 1;
}

export function useCanGoBack() {
  const pathname = usePathname();
  const depth = useRef(-1);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const state = window.history.state as Stamped;
    depth.current = backDepth(state, depth.current);
    if (state?.cwaDepth !== depth.current) {
      window.history.replaceState({ ...state, cwaDepth: depth.current }, "");
    }
    setCanGoBack(depth.current > 0);
  }, [pathname]);

  return canGoBack;
}
