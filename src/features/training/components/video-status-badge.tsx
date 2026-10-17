"use client";

import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrainingVideoStatusName, VideoFailureCode } from "../schemas";

export type VideoStatusLabels = {
  status: Record<TrainingVideoStatusName, string>;
  failure: Record<VideoFailureCode, string>;
};

const PILL =
  "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap";

export function VideoStatusBadge({
  status,
  progress,
  failureCode,
  labels,
  className,
}: {
  status: TrainingVideoStatusName;
  progress: number;
  failureCode?: VideoFailureCode | null;
  labels: VideoStatusLabels;
  className?: string;
}) {
  const label = labels.status[status];

  if (status === "ready")
    return (
      <span className={cn(PILL, "bg-mint-tint text-ink", className)}>
        <Check
          aria-hidden
          className="size-3.5"
        />
        {label}
      </span>
    );

  if (status === "failed")
    return (
      <span
        title={failureCode ? labels.failure[failureCode] : undefined}
        className={cn(PILL, "bg-red-tint text-red-ink", className)}
      >
        <AlertCircle
          aria-hidden
          className="size-3.5"
        />
        {label}
      </span>
    );

  const percent = Math.max(0, Math.min(100, Math.round(progress)));
  const measured = status === "processing";

  return (
    <span
      role="status"
      className={cn(PILL, "gap-2 bg-canvas-deep text-ink", className)}
    >
      <span
        aria-hidden
        className="relative h-1.5 w-12 overflow-hidden rounded-full bg-line"
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-mint transition-[width] duration-700 ease-out motion-reduce:transition-none",
            !measured && "w-1/3 animate-pulse motion-reduce:animate-none",
          )}
          style={measured ? { width: `${Math.max(4, percent)}%` } : undefined}
        />
      </span>
      {label}
      {measured ? (
        <span className="text-ink-soft tabular-nums">{percent}%</span>
      ) : null}
    </span>
  );
}
