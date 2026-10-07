"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";
import { brand } from "@/lib/brand";
import { useResolvedTheme } from "@/lib/theme/client";

const rgb = (hex: string): [number, number, number] => {
  const digits = hex.replace("#", "");
  const full =
    digits.length === 3
      ? digits.replace(/./g, (digit) => digit + digit)
      : digits;
  return [0, 2, 4].map(
    (start) => parseInt(full.slice(start, start + 2), 16) / 255,
  ) as [number, number, number];
};

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
  const theme = useResolvedTheme();

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;

    let phi = EUROPE;
    const ground = getComputedStyle(document.documentElement)
      .getPropertyValue("--canvas")
      .trim();
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
        glowColor: rgb(ground || brand.canvas),
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
  }, [markers, active, theme]);

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
