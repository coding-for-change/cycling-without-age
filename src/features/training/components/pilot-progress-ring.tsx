"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const REDUCED = "(prefers-reduced-motion: reduce)";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia(REDUCED).matches;

const percentFormats = new Map<string, Intl.NumberFormat>();

const percentFormat = (locale: string) => {
  let format = percentFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 0,
    });
    percentFormats.set(locale, format);
  }
  return format;
};

export function useCountUp(target: number, durationMs = 900, from = 0) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (prefersReducedMotion()) {
      const frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, from]);

  return value;
}

export function ProgressRing({
  value,
  size = 72,
  stroke = 7,
  label,
  animate = true,
  tone = "mint",
  className,
  locale,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  animate?: boolean;
  tone?: "mint" | "deep";
  className?: string;
  locale?: string;
  children?: ReactNode;
}) {
  const shown = useCountUp(value, 900, animate ? 0 : value);
  const clamped = Math.max(0, Math.min(1, shown));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-mint-tint"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className={tone === "deep" ? "stroke-mint-deep" : "stroke-mint"}
          style={{ opacity: clamped > 0 ? 1 : 0 }}
        />
      </svg>
      {children || locale ? (
        <span className="absolute inset-0 grid place-items-center text-center">
          {children ?? (
            <span className="font-display text-sm font-bold tabular-nums">
              {percentFormat(locale!).format(clamped)}
            </span>
          )}
        </span>
      ) : null}
    </div>
  );
}
