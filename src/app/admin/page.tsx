import { Suspense, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { Skeleton } from "@/components/ui/skeleton";
import { activityKpis } from "@/use-cases/activity-report";
import { getDictionary, getLocale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/format";
import { hrefWith } from "@/lib/search-params";
import { AdminPageHeader, AdminPageShell } from "./_components/admin-page";
import {
  KpiTilesSkeleton,
  PageHeaderSkeleton,
} from "./_components/admin-skeletons";
import {
  isTrendMetric,
  kpiTiles,
  type KpiMetric,
} from "./_components/kpi-data";
import { KpiTiles } from "./_components/kpi-tiles";
import { OpenReportsLink } from "./_components/overview-header";
import { readActiveScope, type AdminSearchParams } from "./active-scope";
import { ADMIN_LIFE, adminViewer } from "./admin-viewer";

type PageProps = { searchParams: Promise<AdminSearchParams> };

export default function OverviewPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewFrame
          tiles={
            <Suspense fallback={<KpiTilesSkeleton />}>
              <OverviewKpis searchParams={searchParams} />
            </Suspense>
          }
        />
      </Suspense>
    </AdminPageShell>
  );
}

async function OverviewFrame({ tiles }: { tiles: ReactNode }) {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [viewer, dict] = await Promise.all([adminViewer(), getDictionary()]);
  const strings = dict.admin.reports.overview;

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.overview.title}>
        <Suspense fallback={<OpenReportsSkeleton />}>
          <OpenReportsLink
            viewer={viewer}
            label={strings.open}
          />
        </Suspense>
      </AdminPageHeader>
      <section
        aria-labelledby="overview-kpis"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col">
          <h2
            id="overview-kpis"
            className="text-sm font-medium"
          >
            {strings.title}
          </h2>
          <p className="text-xs text-ink-soft">{strings.subtitle}</p>
        </div>
        {tiles}
      </section>
    </>
  );
}

async function OverviewKpis({ searchParams }: PageProps) {
  const { chapterIds, scopeQuery } = await readActiveScope(
    searchParams,
    "overview",
  );
  const [kpis, dict, language, head] = await Promise.all([
    activityKpis(chapterIds.toSorted()),
    getDictionary(),
    getLocale(),
    headers(),
  ]);
  const notation = resolveLocale(head.get("accept-language"));
  const strings = dict.admin.reports;
  const tiles = kpiTiles(kpis, dict, notation);
  const hrefs = Object.fromEntries(
    tiles.map((tile) => [
      tile.metric,
      hrefWith("/admin/reports", scopeQuery, {
        metric:
          isTrendMetric(tile.metric) && tile.metric !== "rides"
            ? tile.metric
            : null,
      }),
    ]),
  ) as Record<KpiMetric, string>;

  return (
    <KpiTiles
      tiles={tiles}
      locale={notation}
      language={language}
      strings={strings.kpis}
      deltaStrings={strings.delta}
      hrefs={hrefs}
    />
  );
}

function OpenReportsSkeleton() {
  return <Skeleton className="h-8 w-28" />;
}

function OverviewSkeleton() {
  return (
    <>
      <PageHeaderSkeleton actions={["h-8 w-28"]} />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-44" />
        </div>
        <KpiTilesSkeleton />
      </div>
    </>
  );
}
