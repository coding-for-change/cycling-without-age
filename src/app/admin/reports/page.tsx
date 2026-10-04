import { Suspense, ViewTransition } from "react";
import { headers } from "next/headers";
import { reportRangeParams } from "@/features/rides";
import { activityReport } from "@/use-cases/activity-report";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import {
  formatDateMedium,
  formatDayMonthShort,
  resolveLocale,
} from "@/lib/format";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { scopeArgOf } from "../scope-cookie";
import { scopeChoices } from "../scopes";
import { ActivityMap } from "./_components/activity-map";
import { CancellationsCard } from "./_components/cancellations-card";
import type { EmptyCardStrings } from "./_components/empty-card";
import { FilterBar } from "./_components/filter-bar";
import { HighlightProvider } from "./_components/highlight-provider";
import { isTrendMetric, kpiTiles } from "./_components/kpi-data";
import { KpiTiles } from "./_components/kpi-tiles";
import { ModelSplitCard } from "./_components/model-split-card";
import { PeopleHealthCard } from "./_components/people-health-card";
import { Rankings } from "./_components/rankings";
import { ReportGrid } from "./_components/report-grid";
import { ReportNavProvider } from "./_components/report-nav";
import { ReportsSkeleton } from "./_components/reports-skeleton";
import { TrendChart } from "./_components/trend-chart";

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function Reports({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { scope, active, chapterIds } = await readActiveScope(
    searchParams,
    "reports",
  );
  const params = await searchParams;

  const [report, dict, language, head] = await Promise.all([
    activityReport({
      chapterIds: chapterIds.toSorted(),
      includePeople: active.kind === "chapter",
      ...reportRangeParams({
        range: one(params.range),
        from: one(params.from),
        to: one(params.to),
      }),
    }),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const notation = resolveLocale(head.get("accept-language"));
  const strings = dict.admin.reports;
  const requestedMetric = one(params.metric);
  const metric = isTrendMetric(requestedMetric) ? requestedMetric : "rides";
  const scopeArg = scopeArgOf(active);
  const { range } = report;
  const scopeCountries = scope.countries.map((country) => country.code);
  const showYear = range.grain === "month" ? undefined : strings.empty.showYear;
  const periodLabel = formatMessage(
    strings.filters.period,
    {
      from:
        range.from.slice(0, 4) === range.last.slice(0, 4)
          ? formatDayMonthShort(range.from, notation)
          : formatDateMedium(range.from, notation),
      to: formatDateMedium(range.last, notation),
    },
    notation,
  );

  const empty: EmptyCardStrings = {
    title: strings.empty.title,
    body: formatMessage(
      strings.empty.body,
      {
        from: formatDateMedium(range.from, notation),
        to: formatDateMedium(range.last, notation),
      },
      notation,
    ),
    showYear,
  };

  return (
    <ReportNavProvider>
      <HighlightProvider>
        <ViewTransition
          key={scopeArg}
          enter="tab-in"
          exit="tab-out"
          default="none"
        >
          <ReportGrid
            filterBar={
              <FilterBar
                range={range}
                previous={{
                  from: range.previous.from,
                  last: range.previous.to,
                }}
                scopes={scopeChoices(scope, dict, language)}
                activeScope={scopeArg}
                generatedAt={report.generatedAt}
                timeZone={report.timeZone}
                locale={notation}
                language={language}
                strings={strings.filters}
              />
            }
            kpis={
              <KpiTiles
                tiles={kpiTiles(report, dict, notation)}
                locale={notation}
                strings={strings.kpis}
              />
            }
            trend={
              <ViewTransition
                key={`${range.from}:${range.to}`}
                enter="tab-in"
                exit="tab-out"
                default="none"
              >
                <TrendChart
                  series={report.series}
                  range={range}
                  defaultMetric={metric}
                  locale={notation}
                  strings={{
                    ...strings.trend,
                    metrics: {
                      rides: strings.kpis.rides,
                      trips: strings.kpis.trips,
                      hours: strings.kpis.hours,
                      cancellations: strings.kpis.cancellations,
                    },
                    period: strings.filters.period,
                  }}
                  empty={empty}
                />
              </ViewTransition>
            }
            place={
              <ActivityMap
                chapters={report.chapters}
                activeChapterId={
                  active.kind === "chapter" ? active.chapter.id : null
                }
                notation={notation}
                strings={strings.map}
              />
            }
            rankings={
              <Rankings
                scope={active.kind}
                chapters={report.chapters}
                countries={report.countries}
                pilots={active.kind === "chapter" ? report.pilots : null}
                riders={active.kind === "chapter" ? report.riders : null}
                scopeCountries={scopeCountries}
                periodLabel={periodLabel}
                notation={notation}
                language={language}
                strings={strings.rankings}
                tableStrings={dict.admin.table}
                showYear={showYear}
              />
            }
            breakdowns={
              <>
                <CancellationsCard
                  cancellations={report.cancellations}
                  total={report.totals.cancellations}
                  rate={report.totals.cancellationRate}
                  notation={notation}
                  language={language}
                  strings={strings.cancellations}
                  deltaStrings={strings.delta}
                  showYear={showYear}
                />
                <ModelSplitCard
                  models={report.models}
                  notation={notation}
                  language={language}
                  strings={strings.models}
                  deltaStrings={strings.delta}
                  showYear={showYear}
                />
                <PeopleHealthCard
                  people={report.people}
                  newRiders={report.totals.newRiders}
                  notation={notation}
                  language={language}
                  strings={strings.people}
                  deltaStrings={strings.delta}
                />
              </>
            }
          />
        </ViewTransition>
      </HighlightProvider>
    </ReportNavProvider>
  );
}
