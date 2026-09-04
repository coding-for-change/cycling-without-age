"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";
import { brand } from "@/lib/brand";

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255,
];

const SIZE = 480;

const phiFor = (longitude: number) =>
  -Math.PI / 2 - (longitude * Math.PI) / 180;

const EUROPE = phiFor(10);

export function Globe({
  markers,
  active,
}: {
  markers: [number, number][];
  active: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;

    let phi = EUROPE;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let globe: ReturnType<typeof createGlobe>;
    try {
      globe = createGlobe(el, {
        devicePixelRatio: 2,
        width: SIZE * 2,
        height: SIZE * 2,
        phi,
        theta: 0.3,
        dark: 0,
        diffuse: 0.4,
        mapSamples: 16000,
        mapBrightness: 1.5,
        mapBaseBrightness: 0.06,
        baseColor: rgb(brand.mint),
        markerColor: rgb(brand.red),
        glowColor: rgb(brand.canvas),
        markers: markers.map((location) => ({ location, size: 0.02 })),
        markerElevation: 0,
      });
    } catch {
      // No WebGL — the SVG sphere underneath stays visible.
      return;
    }

    let frame = 0;
    if (active && !still) {
      const tick = () => {
        phi += 0.0025;
        globe.update({ phi });
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frame);
      globe.destroy();
    };
  }, [markers, active]);

  return (
    <div className="relative mx-auto aspect-square h-full max-h-[min(84vw,27rem)]">
      {}
      <svg
        viewBox="0 0 100 100"
        role="presentation"
        aria-hidden
        className="absolute inset-0 size-full"
      >
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="var(--mint-tint)"
        />
      </svg>
      <canvas
        ref={canvas}
        width={SIZE * 2}
        height={SIZE * 2}
        aria-hidden
        className="absolute inset-0 size-full"
      />
    </div>
  );
}
