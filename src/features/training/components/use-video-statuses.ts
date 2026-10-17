"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { videoStatusesAction, type VideoStatusView } from "../actions";

const POLL_MS = 2_000;
const ACTIVE = new Set(["uploading", "queued", "processing"]);
const TERMINAL = new Set(["ready", "failed"]);

export const isActiveStatus = (status: string) => ACTIVE.has(status);

const useVisible = () => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return visible;
};

export function useVideoStatuses(
  initial: VideoStatusView[],
): Map<string, VideoStatusView> {
  const router = useRouter();
  const visible = useVisible();
  const [statuses, setStatuses] = useState(
    () => new Map(initial.map((video) => [video.id, video])),
  );
  const [previous, setPrevious] = useState(initial);

  if (previous !== initial) {
    const before = new Map(previous.map((video) => [video.id, video.status]));
    const next = new Map(statuses);
    for (const video of initial)
      if (before.get(video.id) !== video.status || !next.has(video.id))
        next.set(video.id, video);
    setPrevious(initial);
    setStatuses(next);
  }

  const activeIds = [...statuses.values()]
    .filter((video) => isActiveStatus(video.status))
    .map((video) => video.id)
    .sort()
    .join(",");

  const statusesRef = useRef(statuses);
  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);

  useEffect(() => {
    if (!activeIds || !visible) return;
    const ids = activeIds.split(",");
    let cancelled = false;
    const poll = async () => {
      const result = await videoStatusesAction(ids);
      if (cancelled || !result.ok) return;
      const settled = result.videos.some(
        (video) =>
          TERMINAL.has(video.status) &&
          !TERMINAL.has(statusesRef.current.get(video.id)?.status ?? ""),
      );
      setStatuses((current) => {
        const next = new Map(current);
        for (const video of result.videos) next.set(video.id, video);
        return next;
      });
      if (settled) router.refresh();
    };
    const timer = setInterval(poll, POLL_MS);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeIds, visible, router]);

  return statuses;
}
