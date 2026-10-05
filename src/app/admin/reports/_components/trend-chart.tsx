"use client";

import { useRef } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  addDays,
  addMonths,
  type ReportGrain,
} from "@/features/rides/report-range";
import type { ReportBucket, RideModelName } from "@/features/rides";
import { formatMessage } from "@/lib/i18n/format";
import {
  formatDayMonthShort,
  formatMonthShort,
  formatMonthYearLong,
  formatNumber,
  formatPeriod,
  formatShortDateWithWeekday,
  type Locale,
} from "@/lib/format";
import { haptics } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";
import { EmptyCard, type EmptyCardStrings } from "./empty-card";
import type { TrendMetric } from "../../_components/kpi-data";
import { ReportCard } from "./report-card";
import { useReportMetric, useReportNav } from "./report-nav";

const MODELS: RideModelName[] = ["event", "pleasure", "functional"];

const COLORS = Object.fromEntries(
  MODELS.map((model, index) => [model, `var(--chart-${index + 1})`]),
) as Record<RideModelName, string>;

export type TrendChartStrings = {
  title: string;
  previous: string;
  total: string;
  weekOf: string;
  zoom: string;
  zoomTo: string;
  label: string;
  models: Record<RideModelName, string>;
  metrics: Record<TrendMetric, string>;
  period: string;
};

type Row = Record<RideModelName, number> & {
  start: string;
  total: number;
  previous: number;
};

export function TrendChart({
  series,
  range,
  locale,
  strings,
  empty,
}: {
  series: ReportBucket[];
  range: { from: string; last: string; grain: ReportGrain };
  locale: Locale;
  strings: TrendChartStrings;
  empty: EmptyCardStrings;
}) {
  const nav = useReportNav();
  const metric = useReportMetric();
  const lastIndex = useRef<number | null>(null);
  const digits = metric === "hours" ? 1 : 0;

  const rows: Row[] = series.map((bucket) => ({
    start: bucket.start,
    event: bucket[metric].event,
    pleasure: bucket[metric].pleasure,
    functional: bucket[metric].functional,
    total: bucket[metric].total,
    previous: bucket.previous[metric],
  }));
  const hasData = rows.some((row) => row.total > 0 || row.previous > 0);
  const zoomable = range.grain !== "day";

  const config = Object.fromEntries(
    MODELS.map((model) => [
      model,
      { label: strings.models[model], color: COLORS[model] },
    ]),
  ) satisfies ChartConfig;

  const tick = (start: string) =>
    range.grain === "month"
      ? formatMonthShort(start, locale)
      : formatDayMonthShort(start, locale);

  const heading = (start: string) =>
    range.grain === "day"
      ? formatShortDateWithWeekday(start, locale)
      : range.grain === "week"
        ? formatMessage(
            strings.weekOf,
            { date: formatDayMonthShort(start, locale) },
            locale,
          )
        : formatMonthYearLong(start, locale);

  const value = (n: number) =>
    formatNumber(n, locale, { maximumFractionDigits: digits });

  const zoomPeriod = (start: string) => {
    const end =
      range.grain === "week"
        ? addDays(start, 6)
        : addDays(addMonths(start, 1), -1);
    return {
      from: start < range.from ? range.from : start,
      to: end > range.last ? range.last : end,
    };
  };

  const zoom = (index: number | undefined) => {
    if (!zoomable || !nav || index === undefined) return;
    const row = rows[index];
    if (!row) return;
    haptics.tap();
    nav.navigate({ ...zoomPeriod(row.start), range: null });
  };

  const title = formatMessage(
    strings.label,
    { metric: strings.metrics[metric], grain: range.grain },
    locale,
  );

  return (
    <ReportCard
      title={strings.metrics[metric]}
      meta={title}
      action={hasData ? <Legend strings={strings} /> : null}
    >
      {hasData ? (
        <div
          onTouchStart={() => haptics.selectionStart()}
          onTouchEnd={() => {
            lastIndex.current = null;
            haptics.selectionEnd();
          }}
          className="touch-pan-y"
        >
          <ChartContainer
            config={config}
            className={cn(
              "aspect-auto h-56 w-full md:h-72",
              zoomable && "[&_.recharts-bar-rectangle]:cursor-zoom-in",
            )}
            initialDimension={{ width: 720, height: 288 }}
            role="img"
            aria-label={title}
          >
            <ComposedChart
              data={rows}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              barCategoryGap="18%"
              onMouseMove={(state) => {
                const index =
                  state.activeTooltipIndex === undefined
                    ? null
                    : Number(state.activeTooltipIndex);
                if (index !== null && index !== lastIndex.current) {
                  if (lastIndex.current !== null) haptics.selectionChanged();
                  lastIndex.current = index;
                }
              }}
              onMouseLeave={() => {
                lastIndex.current = null;
              }}
              onClick={(state) =>
                zoom(
                  state.activeTooltipIndex === undefined
                    ? undefined
                    : Number(state.activeTooltipIndex),
                )
              }
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--chart-grid)"
              />
              <XAxis
                dataKey="start"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={tick}
              />
              <YAxis
                width={36}
                tickLine={false}
                axisLine={false}
                allowDecimals={metric === "hours"}
                tickFormatter={(n: number) =>
                  formatNumber(n, locale, { notation: "compact" })
                }
              />
              <ChartTooltip
                cursor={{ fill: "var(--chart-grid)" }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as Row | undefined;
                  if (!active || !row) return null;
                  const period = zoomable ? zoomPeriod(row.start) : null;
                  return (
                    <TooltipCard
                      heading={heading(row.start)}
                      row={row}
                      strings={strings}
                      value={value}
                      hint={
                        period
                          ? formatMessage(
                              strings.zoomTo,
                              {
                                period: formatMessage(
                                  strings.period,
                                  formatPeriod(period.from, period.to, locale),
                                  locale,
                                ),
                              },
                              locale,
                            )
                          : null
                      }
                    />
                  );
                }}
              />
              {MODELS.map((model, index) => (
                <Bar
                  key={model}
                  dataKey={model}
                  stackId="models"
                  fill={`var(--color-${model})`}
                  stroke="var(--canvas)"
                  strokeWidth={1}
                  radius={index === MODELS.length - 1 ? [4, 4, 0, 0] : 0}
                  maxBarSize={44}
                  animationDuration={420}
                />
              ))}
              <Line
                dataKey="previous"
                type="monotone"
                stroke="var(--chart-previous)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                animationDuration={420}
              />
            </ComposedChart>
          </ChartContainer>
          {zoomable ? (
            <p className="mt-2 hidden text-xs text-ink-faint md:block">
              {strings.zoom}
            </p>
          ) : null}
        </div>
      ) : (
        <EmptyCard
          {...empty}
          className="min-h-56 md:min-h-72"
        />
      )}
    </ReportCard>
  );
}

function Legend({ strings }: { strings: TrendChartStrings }) {
  return (
    <ul className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
      {MODELS.map((model) => (
        <li
          key={model}
          className="flex items-center gap-1.5"
        >
          <span
            aria-hidden
            style={{ backgroundColor: COLORS[model] }}
            className="size-2.5 rounded-sm"
          />
          {strings.models[model]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-0 w-3 border-t-2 border-dashed border-chart-previous"
        />
        {strings.previous}
      </li>
    </ul>
  );
}

function TooltipCard({
  heading,
  row,
  strings,
  value,
  hint,
}: {
  heading: string;
  row: Row;
  strings: TrendChartStrings;
  value: (n: number) => string;
  hint: string | null;
}) {
  return (
    <div className="grid min-w-44 gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-ink">{heading}</p>
      <ul className="grid gap-1">
        {[...MODELS].reverse().map((model) => (
          <li
            key={model}
            className="flex items-center gap-2"
          >
            <span
              aria-hidden
              style={{ backgroundColor: COLORS[model] }}
              className="size-2 rounded-xs"
            />
            <span className="text-ink-soft">{strings.models[model]}</span>
            <span className="ml-auto font-medium text-ink tabular-nums">
              {value(row[model])}
            </span>
          </li>
        ))}
      </ul>
      <div className="grid gap-1 border-t border-line pt-2">
        <p className="flex items-center justify-between gap-3">
          <span className="text-ink-soft">{strings.total}</span>
          <span className="font-semibold text-ink tabular-nums">
            {value(row.total)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-3">
          <span className="text-ink-soft">{strings.previous}</span>
          <span className="text-ink-soft tabular-nums">
            {value(row.previous)}
          </span>
        </p>
      </div>
      {hint ? <p className="text-ink-faint">{hint}</p> : null}
    </div>
  );
}
