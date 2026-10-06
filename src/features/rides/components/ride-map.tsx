"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import type { Coords } from "@/lib/geo";
import {
  boundsOf,
  createMap,
  markerElement,
  MINT_DEEP,
  prefersReducedMotion,
  whenReady,
} from "@/lib/mapbox-canvas";
import { cn } from "@/lib/utils";

export type RideMapProps = {
  pickup: Coords | null;
  destination?: Coords | null;
  route?: [number, number][] | null;
  label: string;
  interactive?: boolean;
  className?: string;
};

const ROUTE = "cwa-ride-route";

const line = (path: [number, number][]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates: path },
});

export default function RideMap({
  pickup,
  destination = null,
  route = null,
  label,
  interactive = false,
  className,
}: RideMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const from = useRef<mapboxgl.Marker | null>(null);
  const to = useRef<mapboxgl.Marker | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    if (!container.current || map.current) return;
    reduced.current = prefersReducedMotion();
    const instance = createMap(container.current, {
      interactive,
      navigation: interactive,
    });
    map.current = instance;

    instance.once("load", () => {
      instance.addSource(ROUTE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      instance.addLayer({
        id: `${ROUTE}-line`,
        type: "line",
        source: ROUTE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": MINT_DEEP, "line-width": 4 },
      });
    });

    return () => {
      instance.remove();
      map.current = null;
      from.current = null;
      to.current = null;
    };
  }, [interactive]);

  const fromLat = pickup?.lat;
  const fromLng = pickup?.lng;
  const toLat = destination?.lat;
  const toLng = destination?.lng;

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    const place = (
      marker: typeof from,
      at: [number, number] | null,
      className: string,
    ) => {
      if (!at) {
        marker.current?.remove();
        marker.current = null;
        return;
      }
      if (marker.current) marker.current.setLngLat(at);
      else
        marker.current = new mapboxgl.Marker({
          element: markerElement(className),
        })
          .setLngLat(at)
          .addTo(instance);
    };

    const start: [number, number] | null =
      fromLat !== undefined && fromLng !== undefined
        ? [fromLng, fromLat]
        : null;
    const end: [number, number] | null =
      toLat !== undefined && toLng !== undefined ? [toLng, toLat] : null;

    place(
      from,
      start,
      "size-5 rounded-full border-[3px] border-white bg-mint-deep shadow-lift",
    );
    place(
      to,
      end,
      "size-5 rounded-md border-[3px] border-white bg-ink shadow-lift",
    );

    whenReady(instance, () => {
      (
        instance.getSource(ROUTE) as mapboxgl.GeoJSONSource | undefined
      )?.setData({
        type: "FeatureCollection",
        features: route && route.length > 1 ? [line(route)] : [],
      });
    });

    const points = [
      ...(start ? [start] : []),
      ...(end ? [end] : []),
      ...(route ?? []),
    ];
    if (!points.length) return;
    const duration = reduced.current ? 0 : 500;
    if (points.length === 1) {
      instance.easeTo({ center: points[0], zoom: 14, duration });
      return;
    }
    instance.fitBounds(boundsOf(points), {
      padding: 32,
      maxZoom: 15,
      duration,
    });
  }, [fromLat, fromLng, toLat, toLng, route]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={label}
      data-vaul-no-drag
      className={cn("size-full", className)}
    />
  );
}
