import { useEffect, useRef } from "react";

const EDGE = 24;
const DISTANCE = 48;

export function useEdgeSwipe(onSwipe: () => void, enabled: boolean) {
  const handler = useRef(onSwipe);

  useEffect(() => {
    handler.current = onSwipe;
  }, [onSwipe]);

  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number } | null = null;

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start =
        event.touches.length === 1 && touch.clientX <= EDGE
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    };
    const onMove = (event: TouchEvent) => {
      if (!start) return;
      const touch = event.touches[0];
      const dx = touch.clientX - start.x;
      const dy = Math.abs(touch.clientY - start.y);
      if (dy > dx) {
        start = null;
        return;
      }
      if (dx >= DISTANCE) {
        start = null;
        handler.current();
      }
    };
    const onEnd = () => {
      start = null;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);
}
