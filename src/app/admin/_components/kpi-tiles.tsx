"use client";

import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "motion/react";
import { formatMessage } from "@/lib/i18n/format";
import { formatNumber, type Locale } from "@/lib/format";
import type { Locale as Language } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import {
  DeltaPill,
  type DeltaStrings,
} from "../reports/_components/delta-pill";
import { ReportLink, useReportMetric } from "../reports/_components/report-nav";
import { isTrendMetric, type KpiTile } from "./kpi-data";
import { Sparkline } from "./sparkline";

export type KpiTileStrings = {
  label: string;
  new: string;
  select: string;
};

export function KpiTiles({
  tiles,
  locale,
  language,
  strings,
  deltaStrings,
  hrefs,
}: {
  tiles: KpiTile[];
  locale: Locale;
  language: Language;
  strings: KpiTileStrings;
  deltaStrings: DeltaStrings;
  hrefs?: Partial<Record<KpiTile["metric"], string>>;
}) {
  const reduceMotion = useReducedMotion();
  const metric = useReportMetric();
  const selected = hrefs ? null : metric;

  return (
    <ul
      aria-label={strings.label}
      className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,1fr))]"
    >
      {tiles.map((tile, index) => (
        <motion.li
          key={tile.metric}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 32,
            delay: index * 0.04,
          }}
          className={cn(
            "w-44 shrink-0 snap-start md:w-auto",
            index === 0 && "w-52 md:col-span-2 lg:col-span-1",
          )}
        >
          <Tile
            tile={tile}
            headline={index === 0}
            locale={locale}
            language={language}
            strings={strings}
            deltaStrings={deltaStrings}
            selected={tile.metric === selected}
            href={hrefs?.[tile.metric]}
          />
        </motion.li>
      ))}
    </ul>
  );
}

function Tile({
  tile,
  headline,
  locale,
  language,
  strings,
  deltaStrings,
  selected,
  href,
}: {
  tile: KpiTile;
  headline: boolean;
  locale: Locale;
  language: Language;
  strings: KpiTileStrings;
  deltaStrings: DeltaStrings;
  selected: boolean;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-2sm text-ink-soft">{tile.label}</span>
        {tile.delta === null && tile.value === 0 ? null : (
          <DeltaPill
            value={tile.delta}
            unit="relative"
            goodWhen={tile.goodWhen}
            newLabel={strings.new}
            notation={locale}
            language={language}
            strings={deltaStrings}
          />
        )}
      </span>
      <NumberFlow
        value={tile.value}
        locales={locale}
        format={{ maximumFractionDigits: tile.fractionDigits }}
        className={cn(
          "font-display font-semibold tracking-tight tabular-nums",
          headline ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl",
        )}
      />
      <span className="flex min-h-8 items-end justify-between gap-3">
        <span className="line-clamp-2 text-xs text-ink-soft">
          {tile.caption ?? tile.previousLabel}
        </span>
        {tile.spark && tile.spark.length > 1 ? (
          <Sparkline
            values={tile.spark}
            emphasis={selected || headline}
          />
        ) : null}
      </span>
    </>
  );

  const className = cn(
    "group flex h-full flex-col gap-1 rounded-2xl border bg-canvas p-4 transition-[border-color,box-shadow,background-color] outline-none focus-visible:ring-2 focus-visible:ring-ink",
    selected
      ? "border-ink/30 shadow-[0_0_0_1px_var(--line)]"
      : "border-line hover:border-ink/20 hover:bg-canvas-deep/40",
  );

  if (!href && !isTrendMetric(tile.metric))
    return (
      <div
        className={className}
        title={tile.previousLabel}
      >
        {body}
      </div>
    );

  return (
    <ReportLink
      href={href}
      patch={{ metric: tile.metric === "rides" ? null : tile.metric }}
      view={!href}
      className={className}
      aria-current={selected ? "true" : undefined}
      aria-label={
        href
          ? `${tile.label}: ${formatNumber(tile.value, locale, { maximumFractionDigits: tile.fractionDigits })}`
          : undefined
      }
      title={
        href
          ? tile.previousLabel
          : `${formatMessage(strings.select, { metric: tile.label }, locale)} · ${tile.previousLabel}`
      }
    >
      {body}
    </ReportLink>
  );
}
