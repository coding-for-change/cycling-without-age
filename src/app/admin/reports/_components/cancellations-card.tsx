import { CloudSun } from "lucide-react";
import type {
  ReportCancellationKey,
  ReportMetric,
  ReportRateMetric,
} from "@/features/rides/report";
import type { Dictionary } from "@/lib/i18n";
import { formatNumber, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale as Language } from "@/lib/i18n/locales";
import { DeltaPill, type DeltaStrings } from "./delta-pill";
import { ReportCard } from "./report-card";
import { ShareBar } from "./share-bar";
import { EmptyCard } from "./empty-card";

export type CancellationsStrings =
  Dictionary["admin"]["reports"]["cancellations"];

const RING = 2 * Math.PI * 42;

export function CancellationsCard({
  cancellations,
  total,
  rate,
  notation,
  language,
  strings,
  deltaStrings,
  showYear,
}: {
  cancellations: {
    category: ReportCancellationKey;
    count: number;
  }[];
  total: ReportMetric;
  rate: ReportRateMetric;
  notation: Locale;
  language: Language;
  strings: CancellationsStrings;
  deltaStrings: DeltaStrings;
  showYear?: string;
}) {
  if (total.current === 0)
    return (
      <ReportCard title={strings.title}>
        <EmptyCard
          icon={CloudSun}
          title={strings.empty.title}
          body={strings.empty.body}
          showYear={showYear}
        />
      </ReportCard>
    );

  const share = rate.current ?? 0;
  const rows = cancellations
    .filter((row) => row.count > 0)
    .sort(
      (a, b) =>
        Number(a.category === "uncategorised") -
          Number(b.category === "uncategorised") || b.count - a.count,
    );
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <ReportCard title={strings.title}>
      <div className="flex items-center gap-5">
        <div className="relative grid size-28 shrink-0 place-items-center">
          <svg
            viewBox="0 0 100 100"
            aria-hidden
            className="absolute inset-0 size-full -rotate-90"
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="10"
              className="stroke-canvas-deep"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(share * RING, share > 0 ? 4 : 0)} ${RING}`}
              className="stroke-mint-deep transition-[stroke-dasharray] duration-500 motion-reduce:transition-none"
            />
          </svg>
          <span className="text-xl font-semibold text-ink tabular-nums">
            {rate.current === null
              ? "–"
              : formatNumber(rate.current, notation, {
                  style: "percent",
                  maximumFractionDigits: 1,
                })}
          </span>
        </div>
        <div className="grid min-w-0 gap-1.25">
          <p className="text-2sm text-ink-soft">{strings.rate}</p>
          <p className="text-sm font-medium text-ink tabular-nums">
            {formatMessage(strings.count, { count: total.current }, language)}
          </p>
          <div>
            <DeltaPill
              value={rate.deltaPoints}
              unit="points"
              goodWhen="down"
              template={strings.points}
              notation={notation}
              language={language}
              strings={deltaStrings}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <h3 className="text-2sm font-medium text-ink-soft">
          {strings.byCategory}
        </h3>
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li
              key={row.category}
              className="grid gap-1.25"
            >
              <div className="flex items-baseline justify-between gap-3 text-2sm">
                <span className="truncate text-ink">
                  {strings.categories[row.category]}
                </span>
                <span
                  className="shrink-0 text-ink-soft tabular-nums"
                  title={formatMessage(
                    strings.share,
                    {
                      share: formatNumber(row.count / total.current, notation, {
                        style: "percent",
                      }),
                    },
                    language,
                  )}
                >
                  {formatNumber(row.count, notation)}
                </span>
              </div>
              <ShareBar
                value={row.count}
                max={max}
                tone={row.category === "uncategorised" ? "faint" : "mint"}
              />
            </li>
          ))}
        </ul>
      </div>
    </ReportCard>
  );
}
