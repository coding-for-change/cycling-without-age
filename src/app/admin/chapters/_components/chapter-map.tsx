"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { circleRing, type Coords } from "@/lib/geo";

export type MapPin = {
  id: string;
  name: string;
  city: string;
  coords: Coords;
  radiusKm: number;
};

const OWN = "cwa-own-area";
const OTHERS = "cwa-other-areas";
const EUROPE = { center: [10.4, 51.2] as [number, number], zoom: 3.5 };

// --mint and --mint-deep. The one place brand colours are written as literals:
// mapbox-gl paints into a canvas, where a CSS variable cannot reach.
const MINT = "#92d2c6";
const MINT_DEEP = "#28584e";

const polygon = (center: Coords, radiusKm: number, props = {}) => ({
  type: "Feature" as const,
  properties: props,
  geometry: {
    type: "Polygon" as const,
    coordinates: [circleRing(center, radiusKm * 1000)],
  },
});

const collection = (features: ReturnType<typeof polygon>[]) => ({
  type: "FeatureCollection" as const,
  features,
});

const boundsOf = (ring: [number, number][]) =>
  ring.reduce(
    (box, point) => box.extend(point),
    new mapboxgl.LngLatBounds(ring[0], ring[0]),
  );

function whenReady(instance: mapboxgl.Map, run: () => void) {
  if (instance.isStyleLoaded()) run();
  else instance.once("idle", run);
}

const dot = (className: string, title?: string) => {
  const element = document.createElement("div");
  element.className = className;
  if (title) element.title = title;
  else element.setAttribute("aria-hidden", "true");
  return element;
};

/**
 * One map for placing a chapter and for looking at all of them. `center` is
 * the chapter being placed or edited (draggable when `onMove` is given) and
 * `others` are the existing chapters, drawn with their own service areas so
 * an overlap is visible before anyone saves.
 */
export default function ChapterMap({
  center,
  radiusKm,
  others,
  selectedId = null,
  onMove,
  onSelect,
  label,
  className,
}: {
  center: Coords | null;
  radiusKm: number;
  others: MapPin[];
  selectedId?: string | null;
  onMove?: (coords: Coords) => void;
  onSelect?: (id: string) => void;
  label: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const own = useRef<mapboxgl.Marker | null>(null);
  const pins = useRef(new Map<string, mapboxgl.Marker>());
  const reduced = useRef(false);
  const moveHandler = useRef(onMove);
  const selectHandler = useRef(onSelect);

  useEffect(() => {
    moveHandler.current = onMove;
    selectHandler.current = onSelect;
  }, [onMove, onSelect]);

  useEffect(() => {
    if (!container.current || map.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const instance = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/light-v11",
      ...EUROPE,
      logoPosition: "bottom-left",
      attributionControl: false,
    });
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }));
    instance.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.current = instance;

    instance.once("load", () => {
      instance.addSource(OTHERS, { type: "geojson", data: collection([]) });
      instance.addLayer({
        id: `${OTHERS}-fill`,
        type: "fill",
        source: OTHERS,
        paint: { "fill-color": MINT, "fill-opacity": 0.1 },
      });
      instance.addLayer({
        id: `${OTHERS}-line`,
        type: "line",
        source: OTHERS,
        paint: {
          "line-color": MINT_DEEP,
          "line-width": 1,
          "line-dasharray": [2, 2],
          "line-opacity": 0.5,
        },
      });
      instance.addSource(OWN, { type: "geojson", data: collection([]) });
      instance.addLayer({
        id: `${OWN}-fill`,
        type: "fill",
        source: OWN,
        paint: { "fill-color": MINT, "fill-opacity": 0.22 },
      });
      instance.addLayer({
        id: `${OWN}-line`,
        type: "line",
        source: OWN,
        paint: { "line-color": MINT_DEEP, "line-width": 2 },
      });
    });

    const markers = pins.current;
    return () => {
      instance.remove();
      map.current = null;
      own.current = null;
      markers.clear();
    };
  }, []);

  const hasCenter = center !== null;

  // The other chapters: pins plus their (dashed) service areas. With nothing
  // in hand they are also what the camera frames.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    const seen = new Set<string>();
    for (const pin of others) {
      seen.add(pin.id);
      let marker = pins.current.get(pin.id);
      if (!marker) {
        const element = dot(
          "size-5 cursor-pointer rounded-full border-2 border-white bg-mint shadow-soft transition-colors hover:bg-mint-deep",
          pin.name,
        );
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          selectHandler.current?.(pin.id);
        });
        marker = new mapboxgl.Marker({ element })
          .setLngLat([pin.coords.lng, pin.coords.lat])
          .addTo(instance);
        pins.current.set(pin.id, marker);
      } else {
        marker.setLngLat([pin.coords.lng, pin.coords.lat]);
      }
    }
    for (const [id, marker] of pins.current) {
      if (seen.has(id)) continue;
      marker.remove();
      pins.current.delete(id);
    }

    whenReady(instance, () => {
      const source = instance.getSource(OTHERS) as
        mapboxgl.GeoJSONSource | undefined;
      source?.setData(
        collection(
          others.map((pin) =>
            polygon(pin.coords, pin.radiusKm, { id: pin.id }),
          ),
        ),
      );
    });

    if (hasCenter || others.length === 0) return;
    instance.fitBounds(
      others.reduce(
        (box, pin) => box.extend([pin.coords.lng, pin.coords.lat]),
        new mapboxgl.LngLatBounds(),
      ),
      { padding: 48, maxZoom: 11, duration: reduced.current ? 0 : 800 },
    );
  }, [others, hasCenter]);

  useEffect(() => {
    for (const [id, marker] of pins.current) {
      const element = marker.getElement();
      element.classList.toggle("bg-mint-deep", id === selectedId);
      element.classList.toggle("bg-mint", id !== selectedId);
    }
  }, [selectedId, others]);

  // The chapter in hand: its pin, its area, and a camera that frames both.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    if (!center) {
      own.current?.remove();
      own.current = null;
      whenReady(instance, () => {
        (
          instance.getSource(OWN) as mapboxgl.GeoJSONSource | undefined
        )?.setData(collection([]));
      });
      return;
    }

    const draggable = Boolean(moveHandler.current);
    if (!own.current) {
      own.current = new mapboxgl.Marker({
        element: dot(
          `size-7 rounded-full border-[3px] border-white bg-mint-deep shadow-lift ${
            draggable ? "cursor-grab active:cursor-grabbing" : ""
          }`,
        ),
        draggable,
      })
        .setLngLat([center.lng, center.lat])
        .addTo(instance);
      own.current.on("dragend", () => {
        const at = own.current?.getLngLat();
        if (at) moveHandler.current?.({ lat: at.lat, lng: at.lng });
      });
    } else {
      own.current.setLngLat([center.lng, center.lat]);
    }

    const ring = circleRing(center, radiusKm * 1000);
    whenReady(instance, () => {
      (instance.getSource(OWN) as mapboxgl.GeoJSONSource | undefined)?.setData(
        collection([polygon(center, radiusKm)]),
      );
    });
    instance.fitBounds(boundsOf(ring), {
      padding: 40,
      maxZoom: 14,
      duration: reduced.current ? 0 : 600,
    });
  }, [center, radiusKm]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={label}
      data-vaul-no-drag
      className={className ?? "size-full"}
    />
  );
}
