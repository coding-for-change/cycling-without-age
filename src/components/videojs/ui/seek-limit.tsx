"use client";

import { createContext, use } from "react";
import { cn } from "@/lib/resolve-class-name";

export type SeekLimitState = {
  percent: number;
  blocked: boolean;
  nonce: number;
  message: string;
};

export const SeekLimitContext = createContext<SeekLimitState | null>(null);

export const useSeekLimit = () => use(SeekLimitContext);

export function SeekLimitLayers() {
  const limit = useSeekLimit();
  if (!limit) return null;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 rounded-media-control bg-media-primary/40"
        style={{ width: `${limit.percent}%` }}
      />
      <div
        aria-hidden
        className="training-player-not-yet pointer-events-none absolute inset-y-0 right-0 rounded-media-control"
        style={{ left: `${limit.percent}%` }}
      />
    </>
  );
}

export function SeekLimitTooltip() {
  const limit = useSeekLimit();
  if (!limit) return null;

  return (
    <div
      key={limit.nonce}
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute bottom-full z-20 mb-3 -translate-x-1/2 rounded-media-popup bg-media-popover px-2.75 py-1.25 text-media-sm whitespace-nowrap text-media-popover-foreground opacity-0 surface-media transition-opacity duration-media-base ease-out data-[blocked=true]:opacity-100",
        limit.blocked && "training-player-shake",
      )}
      data-blocked={limit.blocked}
      style={{ left: `${limit.percent}%` }}
    >
      {limit.blocked ? limit.message : null}
    </div>
  );
}
