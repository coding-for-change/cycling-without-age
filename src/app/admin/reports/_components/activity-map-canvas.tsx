"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useEffectEvent, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { mapTheme } from "@/lib/mapbox-canvas";
import type { Locale } from "@/lib/format";
import {
  chapterKey,
  isChapterHighlighted,
  useHighlight,
} from "./highlight-provider";
import { radiusStops, totalRides } from "./place-geometry";
import { rescopeHref } from "./ranking-model";
import { useReportNav } from "./report-nav";

export type MapChapter = {
  id: string;
  slug: string;
  name: string;
  countryCode: string;
  lat: number;
  lng: number;
  rides: number;
};

const SOURCE = "chapters";
const FOCUS = "chapter-focus";
const WORLD = { center: [10.4, 30] as [number, number], zoom: 1.2 };
const FONT = ["DIN Pro Medium", "Arial Unicode MS Regular"];

type BubbleProperties = { id?: string; cluster_id?: number };

const propertiesOf = (event: mapboxgl.MapMouseEvent) =>
  (event.features?.[0] as { properties?: BubbleProperties } | undefined)
    ?.properties;

const collection = (chapters: MapChapter[]) => ({
  type: "FeatureCollection" as const,
  features: chapters.map((chapter) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [chapter.lng, chapter.lat],
    },
    properties: { id: chapter.id, name: chapter.name, rides: chapter.rides },
  })),
});

const bubbles = (
  id: string,
  source: string,
  color: string,
  chapters: MapChapter[],
): mapboxgl.LayerSpecification => ({
  id,
  type: "circle",
  source,
  paint: {
    "circle-color": color,
    "circle-radius": radius(chapters),
    "circle-stroke-color": mapTheme().canvas,
    "circle-stroke-width": 2,
  },
});

const counts = (
  id: string,
  source: string,
  color: string,
  notation: Locale,
): mapboxgl.LayerSpecification => ({
  id,
  type: "symbol",
  source,
  layout: {
    "text-field": ["number-format", ["get", "rides"], { locale: notation }],
    "text-font": FONT,
    "text-size": 11,
    "text-allow-overlap": true,
  },
  paint: { "text-color": color },
});

const signature = (chapters: MapChapter[]) =>
  chapters.map((chapter) => `${chapter.id}:${chapter.rides}`).join(",");

const idsOf = (chapters: MapChapter[]) =>
  chapters.map((chapter) => chapter.id).join(",");

function radius(chapters: MapChapter[]): mapboxgl.ExpressionSpecification {
  const [from, small, to, large] = radiusStops(totalRides(chapters));
  return [
    "interpolate",
    ["linear"],
    ["sqrt", ["get", "rides"]],
    from,
    small,
    to,
    large,
  ];
}

export default function ActivityMapCanvas({
  chapters,
  activeChapterId,
  notation,
  label,
}: {
  chapters: MapChapter[];
  activeChapterId: string | null;
  notation: Locale;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const ready = useRef(false);
  const reduced = useRef(false);
  const framed = useRef("");
  const { highlighted, highlight } = useHighlight();
  const nav = useReportNav();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pick = useEffectEvent((id: string) => {
    const chapter = chapters.find((c) => c.id === id);
    if (!chapter || chapter.id === activeChapterId) return;
    nav?.go(
      rescopeHref(pathname, searchParams.toString(), {
        chapter: chapter.slug,
      }),
    );
  });
  const loaded = useEffectEvent(() => chapters);
  const hover = useEffectEvent((id: string | null) =>
    highlight(id ? chapterKey(id) : null),
  );

  useEffect(() => {
    if (!container.current || map.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const instance = new mapboxgl.Map({
      container: container.current,
      style: mapTheme().style,
      projection: "globe",
      ...WORLD,
      logoPosition: "bottom-left",
      attributionControl: false,
      cooperativeGestures: true,
    });
    instance.addControl(new mapboxgl.AttributionControl({ compact: true }));
    instance.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.current = instance;

    const colors = mapTheme();

    instance.on("style.load", () => {
      instance.setFog({
        color: colors.canvas,
        "high-color": colors.mint,
        "space-color": colors.canvas,
        "horizon-blend": 0.03,
        "star-intensity": 0,
      });
    });

    instance.on("load", () => {
      const current = loaded();
      instance.addSource(SOURCE, {
        type: "geojson",
        data: collection(current),
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 9,
        clusterProperties: { rides: ["+", ["get", "rides"]] },
      });
      instance.addSource(FOCUS, { type: "geojson", data: collection([]) });

      instance.addLayer(
        bubbles("chapter-bubbles", SOURCE, colors.mint, current),
      );
      instance.addLayer(
        bubbles("chapter-focus", FOCUS, colors.mintDeep, current),
      );
      instance.addLayer(counts("chapter-counts", SOURCE, colors.ink, notation));
      instance.addLayer(
        counts("chapter-focus-count", FOCUS, colors.canvas, notation),
      );
      instance.addLayer({
        id: "chapter-names",
        type: "symbol",
        source: SOURCE,
        filter: ["!", ["has", "point_count"]],
        minzoom: 3,
        layout: {
          "text-field": ["get", "name"],
          "text-font": FONT,
          "text-size": 11,
          "text-anchor": "top",
          "text-radial-offset": 2.6,
          "text-optional": true,
        },
        paint: {
          "text-color": colors.inkSoft,
          "text-halo-color": colors.canvas,
          "text-halo-width": 1.5,
        },
      });

      instance.on("click", "chapter-bubbles", (event) => {
        const properties = propertiesOf(event);
        if (!properties) return;
        const clusterId = properties.cluster_id;
        if (clusterId === undefined) {
          if (properties.id) pick(properties.id);
          return;
        }
        const center = event.lngLat;
        instance
          .getSource<mapboxgl.GeoJSONSource>(SOURCE)
          ?.getClusterExpansionZoom(clusterId, (error, zoom) => {
            if (error || zoom == null) return;
            instance.easeTo({
              center,
              zoom,
              duration: reduced.current ? 0 : 600,
            });
          });
      });
      instance.on("mousemove", "chapter-bubbles", (event) => {
        instance.getCanvas().style.cursor = "pointer";
        hover(propertiesOf(event)?.id ?? null);
      });
      instance.on("mouseleave", "chapter-bubbles", () => {
        instance.getCanvas().style.cursor = "";
        hover(null);
      });

      ready.current = true;
      framed.current = idsOf(current);
      frame(instance, current, reduced.current);
    });

    return () => {
      ready.current = false;
      instance.remove();
      map.current = null;
    };
  }, [notation]);

  const shape = signature(chapters);
  const sync = useEffectEvent(() => {
    const instance = map.current;
    if (!instance || !ready.current) return;
    instance
      .getSource<mapboxgl.GeoJSONSource>(SOURCE)
      ?.setData(collection(chapters));
    instance.setPaintProperty(
      "chapter-bubbles",
      "circle-radius",
      radius(chapters),
    );
    instance.setPaintProperty(
      "chapter-focus",
      "circle-radius",
      radius(chapters),
    );
    const ids = idsOf(chapters);
    if (ids === framed.current) return;
    framed.current = ids;
    frame(instance, chapters, reduced.current);
  });

  useEffect(() => {
    sync();
  }, [shape]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !ready.current) return;
    instance
      .getSource<mapboxgl.GeoJSONSource>(FOCUS)
      ?.setData(
        collection(
          chapters.filter((chapter) =>
            isChapterHighlighted(highlighted, chapter),
          ),
        ),
      );
  }, [highlighted, chapters]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      data-vaul-no-drag
      className="size-full"
    />
  );
}

function frame(instance: mapboxgl.Map, chapters: MapChapter[], still: boolean) {
  const duration = still ? 0 : 1200;
  if (chapters.length === 0) {
    instance.easeTo({ ...WORLD, duration });
    return;
  }
  if (chapters.length === 1) {
    instance.flyTo({
      center: [chapters[0].lng, chapters[0].lat],
      zoom: 10,
      duration,
    });
    return;
  }
  instance.fitBounds(
    chapters.reduce(
      (box, chapter) => box.extend([chapter.lng, chapter.lat]),
      new mapboxgl.LngLatBounds(),
    ),
    { padding: 64, maxZoom: 11, duration },
  );
}
