import mapboxgl from "mapbox-gl";

// --mint and --mint-deep. The one place brand colours are written as literals:
// mapbox-gl paints into a canvas, where a CSS variable cannot reach.
export const MINT = "#92d2c6";
export const MINT_DEEP = "#28584e";

export const FALLBACK_VIEW = {
  center: [10.4, 51.2] as [number, number],
  zoom: 3.5,
};

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createMap(
  container: HTMLElement,
  {
    navigation = true,
    ...options
  }: Omit<mapboxgl.MapOptions, "container"> & {
    navigation?: boolean;
  } = {},
) {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const instance = new mapboxgl.Map({
    container,
    style: "mapbox://styles/mapbox/light-v11",
    ...FALLBACK_VIEW,
    logoPosition: "bottom-left",
    attributionControl: false,
    ...options,
  });
  instance.addControl(new mapboxgl.AttributionControl({ compact: true }));
  if (navigation)
    instance.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );
  return instance;
}

export function whenReady(instance: mapboxgl.Map, run: () => void) {
  if (instance.isStyleLoaded()) run();
  else instance.once("idle", run);
}

export function markerElement(className: string, title?: string) {
  const element = document.createElement("div");
  element.className = className;
  if (title) element.title = title;
  else element.setAttribute("aria-hidden", "true");
  return element;
}

export const boundsOf = (points: [number, number][]) =>
  points.reduce((box, point) => box.extend(point), new mapboxgl.LngLatBounds());
