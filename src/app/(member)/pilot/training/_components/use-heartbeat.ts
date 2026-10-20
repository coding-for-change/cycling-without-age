"use client";

import { useCallback, useEffect, useRef } from "react";

const ENDPOINT = "/api/training/progress";
const INTERVAL_MS = 15_000;
const MIN_GAP_MS = 2_000;

export type Reading = { position: number; furthest: number };

export function useHeartbeat({
  courseId,
  lessonId,
  read,
  enabled,
}: {
  courseId: string;
  lessonId: string;
  read: () => Reading;
  enabled: boolean;
}) {
  const readRef = useRef(read);
  const lastSent = useRef(0);
  const dirty = useRef(false);
  const playing = useRef(false);

  useEffect(() => {
    readRef.current = read;
  });

  const payload = useCallback(() => {
    const { position, furthest } = readRef.current();
    return JSON.stringify({
      courseId,
      lessonId,
      position: Math.max(0, position),
      furthest: Math.max(0, furthest),
    });
  }, [courseId, lessonId]);

  const send = useCallback(
    async (force = false) => {
      if (!enabled) return;
      const now = Date.now();
      if (!force && now - lastSent.current < MIN_GAP_MS) {
        dirty.current = true;
        return;
      }
      lastSent.current = now;
      dirty.current = false;
      await fetch(ENDPOINT, {
        method: "POST",
        keepalive: true,
        credentials: "same-origin",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: payload(),
      }).catch(() => undefined);
    },
    [enabled, payload],
  );

  const beacon = useCallback(() => {
    if (!enabled || lastSent.current === 0) return;
    const body = new Blob([payload()], { type: "text/plain;charset=UTF-8" });
    if (!navigator.sendBeacon?.(ENDPOINT, body)) void send(true);
    lastSent.current = Date.now();
  }, [enabled, payload, send]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (playing.current || dirty.current) void send(true);
    }, INTERVAL_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") beacon();
    };
    window.addEventListener("pagehide", beacon);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", beacon);
      document.removeEventListener("visibilitychange", onHide);
      beacon();
    };
  }, [enabled, send, beacon]);

  return {
    send,
    setPlaying: (value: boolean) => {
      playing.current = value;
    },
  };
}
