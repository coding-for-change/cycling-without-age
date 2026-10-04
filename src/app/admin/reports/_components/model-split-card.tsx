import { Bike } from "lucide-react";
import { metric, type ActivityAggregate } from "@/features/rides/report";
import type { Dictionary } from "@/lib/i18n";
import { formatNumber, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale as Language } from "@/lib/i18n/locales";
import { DeltaPill, type DeltaStrings } from "./delta-pill";
import { ReportCard } from "./report-card";
import { EmptyCard } from "./empty-card";

export type ModelSplitStrings = Dictionary["admin"]["reports"]["models"];

export function ModelSplitCard({
  models,
  notation,
  language,
  strings,
  deltaStrings,
  showYear,
}: {
  models: ActivityAggregate["models"];
  notation: Locale;
  language: Language;
  strings: ModelSplitStrings;
  deltaStrings: DeltaStrings;
  showYear?: string;
}) {
  const total = models.reduce((sum, row) => sum + row.rides, 0);

  if (total === 0)
    return (
      <ReportCard title={strings.title}>
        <EmptyCard
          icon={Bike}
          title={strings.empty.title}
          body={strings.empty.body}
          showYear={showYear}
        />
      </ReportCard>
    );

  const max = Math.max(...models.map((row) => row.rides), 1);

  return (
    <ReportCard title={strings.title}>
      <ul className="grid gap-5">
        {models.map((row) => {
          const share = formatNumber(row.rides / total, notation, {
            style: "percent",
          });
          return (
            <li
              key={row.model}
              className="grid gap-2"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink">
                  {strings.names[row.model]}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {formatNumber(row.rides, notation)}
                  </span>
                  <DeltaPill
                    value={metric(row.rides, row.previousRides).delta}
                    unit="relative"
                    notation={notation}
                    language={language}
                    strings={deltaStrings}
                  />
                </span>
              </div>
              <div
                aria-hidden
                className="h-2 overflow-hidden rounded-full bg-canvas-deep"
              >
                <div
                  style={{ width: `${(row.rides / max) * 100}%` }}
                  className="h-full rounded-full bg-mint transition-[width] duration-500 motion-reduce:transition-none"
                />
              </div>
              <div className="flex justify-between gap-3 text-xs text-ink-soft tabular-nums">
                <span>{formatMessage(strings.share, { share }, language)}</span>
                <span>
                  {formatMessage(
                    strings.hours,
                    {
                      value: formatNumber(row.hours, notation, {
                        maximumFractionDigits: 1,
                      }),
                    },
                    language,
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </ReportCard>
  );
}
