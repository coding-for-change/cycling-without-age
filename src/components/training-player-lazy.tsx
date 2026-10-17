"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TrainingPlayerProps } from "./training-player";

export type {
  TrainingPlayerHandle,
  TrainingPlayerProps,
} from "./training-player";

export const preloadTrainingPlayer = () => import("./training-player");

export function TrainingPlayerFallback({
  poster,
  className,
}: {
  poster?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-2xl bg-mint-deep",
        className,
      )}
    >
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="size-full object-contain"
        />
      ) : (
        <Skeleton className="size-full rounded-none" />
      )}
    </div>
  );
}

const TrainingPlayer = dynamic(() => import("./training-player"), {
  ssr: false,
  loading: () => null,
});

export function LazyTrainingPlayer({
  fallbackClassName,
  ...props
}: TrainingPlayerProps & { fallbackClassName?: string }) {
  return (
    <div className={cn("relative aspect-video w-full", props.className)}>
      <TrainingPlayerFallback
        poster={props.poster}
        className={cn("absolute inset-0", fallbackClassName)}
      />
      <TrainingPlayer
        {...props}
        className="relative"
      />
    </div>
  );
}
