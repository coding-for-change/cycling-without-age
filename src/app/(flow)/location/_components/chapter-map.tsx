"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { distanceMeters, type Coords } from "@/lib/geo";
import type { ChapterPin } from "./location-screen";

const NEARBY_M = 25_000;
const CLOSE_UP = { zoom: 15.5, pitch: 55 } as const;

const ROUTE_SOURCE = "cwa-route";

function whenReady(instance: mapboxgl.Map, run: () => void) {
  if (instance.isStyleLoaded()) run();
  else instance.once("idle", run);
}

export default function ChapterMap({
  chapters,
  selected,
  here,
  home,
  route,
  label,
}: {
  chapters: ChapterPin[];
  selected: string[];
  here: Coords | null;
  home?: Coords | null;
  route?: [number, number][] | null;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef(new Map<string, mapboxgl.Marker>());
  const homeMarker = useRef<mapboxgl.Marker | null>(null);
  const lastCentre = useRef<Coords | null>(null);
  const bearingSign = useRef(1);
  const reduced = useRef(false);

  useEffect(() => {
    if (!container.current || map.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    map.current = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [10.4, 51.2],
      zoom: 3.5,
      maxPitch: 60,
      logoPosition: "bottom-left",
    });

    const instance = map.current;
    const pins = markers.current;
    return () => {
      instance.remove();
      map.current = null;
      homeMarker.current = null;
      pins.clear();
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    const draw = () => {
      if (home) {
        // Position before `addTo`: a marker added without one throws inside
        // mapbox-gl's first `project()` rather than simply rendering nowhere.
        if (!homeMarker.current) {
          homeMarker.current = new mapboxgl.Marker({ element: homeElement() })
            .setLngLat([home.lng, home.lat])
            .addTo(instance);
        } else {
          homeMarker.current.setLngLat([home.lng, home.lat]);
        }
      } else {
        homeMarker.current?.remove();
        homeMarker.current = null;
      }

      const line = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: route ?? [] },
      };
      const source = instance.getSource(ROUTE_SOURCE);
      if (source) {
        (source as mapboxgl.GeoJSONSource).setData(line);
        return;
      }
      instance.addSource(ROUTE_SOURCE, { type: "geojson", data: line });
      instance.addLayer({
        id: ROUTE_SOURCE,
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        // --mint-deep. The one place a brand colour is written as a literal:
        // mapbox-gl paints into a canvas, where a CSS variable cannot reach.
        paint: {
          "line-color": "#28584e",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });
    };

    whenReady(instance, draw);
  }, [home, route]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    for (const chapter of chapters) {
      if (markers.current.has(chapter.id)) continue;
      const element = document.createElement("div");
      element.setAttribute("aria-hidden", "true");
      element.className =
        "size-6 rounded-full border-2 border-white shadow-soft transition-colors";
      markers.current.set(
        chapter.id,
        new mapboxgl.Marker({ element })
          .setLngLat([chapter.coords.lng, chapter.coords.lat])
          .addTo(instance),
      );
    }
  }, [chapters]);

  useEffect(() => {
    for (const [id, marker] of markers.current) {
      const element = marker.getElement();
      element.classList.toggle("bg-mint-deep", selected.includes(id));
      element.classList.toggle("bg-mint", !selected.includes(id));
    }
  }, [selected]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    const target = chapters.find(
      (chapter) => chapter.id === selected.at(-1),
    )?.coords;

    const run = () => {
      // An address and its chapter only mean something side by side, so they get
      // a frame rather than the close-up a chosen chapter gets.
      if (home) {
        const points: [number, number][] = [
          [home.lng, home.lat],
          ...(route ?? []),
          ...(target ? ([[target.lng, target.lat]] as [number, number][]) : []),
        ];
        lastCentre.current = null;

        // A single point has no area, and `fitBounds` on a zero-size box quietly
        // does nothing at all — the map would simply stay where it was.
        if (points.length === 1) {
          instance.easeTo({
            center: points[0],
            zoom: CLOSE_UP.zoom,
            pitch: 0,
            bearing: 0,
            duration: 900,
          });
          return;
        }

        instance.fitBounds(
          points.reduce(
            (box, point) => box.extend(point),
            new mapboxgl.LngLatBounds(),
          ),
          { padding: 72, maxZoom: 16, pitch: 0, bearing: 0, duration: 900 },
        );
        return;
      }

      if (!target) {
        // Nothing chosen: frame everything there is, flat.
        const pinned = chapters.filter((chapter) => chapter.coords);
        if (pinned.length === 0) return;
        const bounds = pinned.reduce(
          (box, chapter) =>
            box.extend([chapter.coords!.lng, chapter.coords!.lat]),
          new mapboxgl.LngLatBounds(),
        );
        if (here) bounds.extend([here.lng, here.lat]);
        lastCentre.current = null;
        instance.fitBounds(bounds, {
          padding: 48,
          maxZoom: 11,
          pitch: 0,
          bearing: 0,
          duration: 800,
        });
        return;
      }

      // Swing the bearing the other way each time, so moving between two
      // chapters twice never produces an identical, apparently broken, camera.
      bearingSign.current *= -1;
      const camera = {
        center: [target.lng, target.lat] as [number, number],
        bearing: reduced.current ? 0 : 20 * bearingSign.current,
        pitch: reduced.current ? 0 : CLOSE_UP.pitch,
        zoom: CLOSE_UP.zoom,
      };

      const previous = lastCentre.current;
      lastCentre.current = target;

      // A parabolic flight is the point across a country and a glitch across a
      // few streets, so short hops ease instead.
      if (previous && distanceMeters(previous, target) < NEARBY_M) {
        instance.easeTo({ ...camera, duration: 1200 });
      } else {
        instance.flyTo({ ...camera, duration: 2400, curve: 1.5, speed: 0.8 });
      }
    };

    whenReady(instance, run);
  }, [selected, chapters, here, home, route]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={label}
      className="size-full [&_.mapboxgl-ctrl-logo]:opacity-70"
    />
  );
}

/** A ring rather than a dot, so the home reads as "you" next to the chapter pins
 *  without adding a colour the brand does not have. */
function homeElement() {
  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  element.className =
    "size-5 rounded-full border-4 border-mint-deep bg-white shadow-soft";
  return element;
}
