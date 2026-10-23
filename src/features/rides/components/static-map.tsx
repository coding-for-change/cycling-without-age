"use client";

import { useSyncExternalStore } from "react";
import { useResolvedTheme } from "@/lib/theme/client";
import { START_MARKER } from "@/lib/map-markers";
import { cn } from "@/lib/utils";
import { HEIGHT, WIDTH, staticMapUrl } from "./static-map-url";

const noop = () => () => {};

export function StaticMap({
  lat,
  lng,
  label,
  zoom = 14.5,
  className,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  label: string;
  zoom?: number;
  className?: string;
}) {
  const theme = useResolvedTheme();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || lat == null || lng == null) return null;

  return (
    <div
      className={cn(
        "relative aspect-2/1 w-full overflow-hidden rounded-(--r-cover) bg-canvas-deep",
        className,
      )}
    >
      {hydrated ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={staticMapUrl({ lat, lng, zoom, theme, token })}
          alt={label}
          width={WIDTH}
          height={HEIGHT}
          loading="lazy"
          decoding="async"
          className="size-full object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        />
      ) : null}
      <span
        aria-hidden
        className={cn(
          START_MARKER,
          "pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
      />
    </div>
  );
}
