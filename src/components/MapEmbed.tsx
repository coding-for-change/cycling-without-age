"use client";

/* Keyless map embed (OpenStreetMap iframe — the stand-in for the Google Maps
   API; swap the src for the Maps Embed API in production). Known seed
   addresses resolve to real Munich coordinates. */

import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

const GEO: Record<string, [number, number]> = {
  "agnes-bernauer": [48.1425, 11.5133],
  fürstenrieder: [48.1268, 11.5119],
  hirschgarten: [48.1521, 11.5266],
  rosenau: [48.1287, 11.4954],
  westendstr: [48.1332, 11.5083],
  westpark: [48.1207, 11.5251],
  "laimer platz": [48.133, 11.505],
};

export function MapEmbed({
  address,
  small,
  caption = true,
}: {
  address: string;
  small?: boolean;
  caption?: boolean;
}) {
  let pt: [number, number] = [48.1374, 11.5155]; // Munich center fallback
  const a = String(address || "").toLowerCase();
  for (const k of Object.keys(GEO)) {
    if (a.includes(k)) {
      pt = GEO[k];
      break;
    }
  }
  const d = 0.006;
  const bbox = `${pt[1] - d}%2C${pt[0] - d * 0.6}%2C${pt[1] + d}%2C${pt[0] + d * 0.6}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${pt[0]}%2C${pt[1]}`;
  return (
    <div className={cn("map-embed", small && "map-embed-sm")}>
      <iframe
        src={src}
        loading="lazy"
        title="Map"
      />
      {caption && (
        <div className="map-caption">
          <Icon name="mapPin" />
          <span className="truncate">{address}</span>
        </div>
      )}
    </div>
  );
}

/** Munich address suggestions — native datalist, the mock stand-in for Places
 * autocomplete. Give inputs list="cwa-addresses" and render this once per view. */
export function AddressDatalist() {
  const opts = [
    "Agnes-Bernauer-Str. 12",
    "Fürstenrieder Str. 45",
    "Hirschgartenallee 8",
    "Westendstr. 305",
    "Westpark Rosengarten",
    "Rosenauer Weg 3",
    "Laimer Platz 2",
    "Nymphenburger Schlosspark",
    "Seniorenheim Rosenau",
  ];
  return (
    <datalist id="cwa-addresses">
      {opts.map((o) => (
        <option
          key={o}
          value={o}
        />
      ))}
    </datalist>
  );
}
