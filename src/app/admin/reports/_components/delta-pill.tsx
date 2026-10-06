import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { formatNumber, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale as Language } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

export type DeltaStrings = Dictionary["admin"]["reports"]["delta"];

export function DeltaPill({
  value,
  unit,
  goodWhen = "up",
  template,
  newLabel,
  notation,
  language,
  strings,
}: {
  value: number | null;
  unit: "relative" | "points";
  goodWhen?: "up" | "down";
  template?: string;
  newLabel?: string;
  notation: Locale;
  language: Language;
  strings: DeltaStrings;
}) {
  if (value === null)
    return newLabel ? (
      <span className="shrink-0 rounded-full bg-mint-tint px-2 py-0.5 text-xs font-medium text-ink">
        {newLabel}
      </span>
    ) : (
      <span className="text-xs text-ink-faint">{strings.none}</span>
    );

  const rounded =
    unit === "relative"
      ? Math.round(value * 100)
      : Math.round(value * 1000) / 10;
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const magnitude =
    unit === "relative"
      ? formatNumber(Math.abs(rounded) / 100, notation, { style: "percent" })
      : formatNumber(Math.abs(rounded), notation, {
          maximumFractionDigits: 1,
        });
  const number =
    unit === "relative"
      ? formatNumber(rounded / 100, notation, {
          style: "percent",
          signDisplay: "exceptZero",
        })
      : formatNumber(rounded, notation, {
          maximumFractionDigits: 1,
          signDisplay: "exceptZero",
        });
  const withUnit = (value: string) =>
    template ? formatMessage(template, { points: value }, language) : value;
  const shown = withUnit(number);
  const label =
    direction === "flat"
      ? strings.flat
      : formatMessage(
          strings[direction],
          { value: withUnit(magnitude) },
          language,
        );
  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <span
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
        direction !== "flat" && direction === goodWhen
          ? "bg-mint-tint text-ink"
          : "bg-canvas-deep text-ink-soft",
      )}
    >
      <Icon
        aria-hidden
        className="size-3"
      />
      {shown}
    </span>
  );
}
