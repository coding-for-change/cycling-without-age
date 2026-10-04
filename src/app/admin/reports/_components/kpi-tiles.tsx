"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { formatMessage } from "@/lib/i18n/format";
import { formatNumber, type Locale } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isTrendMetric, type KpiTile } from "./kpi-data";
import { ReportLink, useReportNav } from "./report-nav";

export type KpiTileStrings = {
  label: string;
  new: string;
  select: string;
};

export function KpiTiles({
  tiles,
  locale,
  strings,
  hrefs,
}: {
  tiles: KpiTile[];
  locale: Locale;
  strings: KpiTileStrings;
  hrefs?: Partial<Record<KpiTile["metric"], string>>;
}) {
  const nav = useReportNav();
  const reduceMotion = useReducedMotion();
  const requested = nav?.query.get("metric");
  const selected = hrefs
    ? null
    : isTrendMetric(requested)
      ? requested
      : "rides";

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
            strings={strings}
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
  strings,
  selected,
  href,
}: {
  tile: KpiTile;
  headline: boolean;
  locale: Locale;
  strings: KpiTileStrings;
  selected: boolean;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-2sm text-ink-soft">{tile.label}</span>
        <DeltaPill
          tile={tile}
          locale={locale}
          newLabel={strings.new}
        />
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

  if (tile.metric === "riders" && !href)
    return (
      <div
        className={className}
        title={tile.previousLabel}
      >
        {body}
      </div>
    );

  const label = formatMessage(strings.select, { metric: tile.label }, locale);

  if (href)
    return (
      <Link
        href={href}
        className={className}
        title={tile.previousLabel}
        aria-label={`${tile.label}: ${formatNumber(tile.value, locale, { maximumFractionDigits: tile.fractionDigits })}`}
      >
        {body}
      </Link>
    );

  return (
    <ReportLink
      patch={{ metric: tile.metric === "rides" ? null : tile.metric }}
      className={className}
      aria-current={selected ? "true" : undefined}
      title={`${label} · ${tile.previousLabel}`}
    >
      {body}
    </ReportLink>
  );
}

function DeltaPill({
  tile,
  locale,
  newLabel,
}: {
  tile: KpiTile;
  locale: Locale;
  newLabel: string;
}) {
  if (tile.delta === null)
    return tile.value > 0 ? (
      <span className="rounded-full bg-mint-tint px-2 text-xs leading-5 font-medium text-ink">
        {newLabel}
      </span>
    ) : null;

  const flat = Math.abs(tile.delta) < 0.005;
  const up = tile.delta > 0;
  const good = !flat && (tile.goodWhen === "up" ? up : !up);
  const Icon = flat ? ArrowRight : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 text-xs leading-5 font-medium tabular-nums",
        good ? "bg-mint-tint text-ink" : "bg-canvas-deep text-ink-soft",
      )}
    >
      <Icon
        aria-hidden
        className="size-3"
      />
      {formatNumber(tile.delta, locale, {
        style: "percent",
        signDisplay: "exceptZero",
        maximumFractionDigits: Math.abs(tile.delta) < 0.1 ? 1 : 0,
      })}
    </span>
  );
}

function Sparkline({
  values,
  emphasis,
}: {
  values: number[];
  emphasis: boolean;
}) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <span
      aria-hidden
      className="block h-8 w-20 shrink-0"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 80, height: 32 }}
      >
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <YAxis
            hide
            domain={[0, "dataMax"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={emphasis ? "var(--chart-1)" : "var(--chart-2)"}
            strokeWidth={1.5}
            fill={emphasis ? "var(--chart-1)" : "var(--chart-2)"}
            fillOpacity={0.12}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </span>
  );
}
