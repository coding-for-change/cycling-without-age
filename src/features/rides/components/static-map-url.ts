export const WIDTH = 640;
export const HEIGHT = 320;
const STYLE = { light: "light-v11", dark: "dark-v11" } as const;

export function staticMapUrl({
  lat,
  lng,
  zoom,
  theme,
  token,
}: {
  lat: number;
  lng: number;
  zoom: number;
  theme: keyof typeof STYLE;
  token: string;
}) {
  const center = `${lng.toFixed(5)},${lat.toFixed(5)},${zoom},0`;
  return `https://api.mapbox.com/styles/v1/mapbox/${STYLE[theme]}/static/${center}/${WIDTH}x${HEIGHT}@2x?access_token=${encodeURIComponent(token)}`;
}

export const hasStaticMap = (
  lat: number | null | undefined,
  lng: number | null | undefined,
) =>
  Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN) && lat != null && lng != null;
