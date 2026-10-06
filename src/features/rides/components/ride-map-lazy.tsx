"use client";

import dynamic from "next/dynamic";
import { MapUnavailable } from "@/components/map-unavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { MAP_ENABLED } from "@/lib/mapbox-map";
import { cn } from "@/lib/utils";
import type { RideMapProps } from "./ride-map";

const RideMap = dynamic(() => import("./ride-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export function LazyRideMap({
  unavailable,
  className,
  ...props
}: RideMapProps & { unavailable: string }) {
  return (
    <div
      className={cn(
        "relative h-36 w-full overflow-hidden rounded-lg border border-line bg-canvas-deep",
        !MAP_ENABLED &&
          "flex items-center justify-center border-dashed bg-transparent px-4 text-center",
        className,
      )}
    >
      {MAP_ENABLED ? (
        <RideMap {...props} />
      ) : (
        <MapUnavailable label={unavailable} />
      )}
    </div>
  );
}
