import type { ActivityKpis } from "@/use-cases/activity-report";
import type { Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { formatNumber, type Locale } from "@/lib/format";

export const TREND_METRICS = [
  "rides",
  "trips",
  "hours",
  "cancellations",
] as const;
export type TrendMetric = (typeof TREND_METRICS)[number];
export type KpiMetric = TrendMetric | "riders";

export const isTrendMetric = (value: unknown): value is TrendMetric =>
  TREND_METRICS.includes(value as TrendMetric);

export type KpiTile = {
  metric: KpiMetric;
  label: string;
  value: number;
  delta: number | null;
  previousLabel: string;
  caption: string | null;
  spark: number[] | null;
  goodWhen: "up" | "down";
  fractionDigits: number;
};

const ORDER: KpiMetric[] = [
  "rides",
  "trips",
  "riders",
  "hours",
  "cancellations",
];

export function kpiTiles(
  kpis: Pick<ActivityKpis, "totals" | "series">,
  dict: Dictionary,
  notation: Locale,
): KpiTile[] {
  const strings = dict.admin.reports.kpis;
  const { totals, series } = kpis;

  return ORDER.map((metric) => {
    const total = totals[metric];
    const fractionDigits = metric === "hours" ? 1 : 0;
    const rate = totals.cancellationRate.current;
    return {
      metric,
      label: strings[metric],
      value: total.current,
      delta: total.delta,
      previousLabel: formatMessage(
        strings.previous,
        {
          value: formatNumber(total.previous, notation, {
            maximumFractionDigits: fractionDigits,
          }),
        },
        notation,
      ),
      caption:
        metric === "rides"
          ? strings.ridesHint
          : metric === "cancellations" && rate !== null
            ? formatMessage(
                strings.rate,
                {
                  rate: formatNumber(rate, notation, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  }),
                },
                notation,
              )
            : null,
      spark:
        metric === "riders"
          ? null
          : series.map((bucket) =>
              metric === "hours"
                ? bucket.hours.total
                : metric === "trips"
                  ? bucket.trips.total
                  : metric === "cancellations"
                    ? bucket.cancellations.total
                    : bucket.rides.total,
            ),
      goodWhen: metric === "cancellations" ? "down" : "up",
      fractionDigits,
    };
  });
}
