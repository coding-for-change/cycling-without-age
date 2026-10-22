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
import { OverviewActivity } from "./_components/overview-activity";
import { OverviewAttention } from "./_components/overview-attention";
import { OpenReportsLink } from "./_components/overview-header";
import {
  ActivitySkeleton,
  AttentionSkeleton,
  WeekSkeleton,
} from "./_components/overview-skeletons";
import { OverviewWeek } from "./_components/overview-week";
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
          attention={
            <Suspense fallback={<AttentionSkeleton />}>
              <OverviewAttention searchParams={searchParams} />
            </Suspense>
          }
          week={
            <Suspense fallback={<WeekSkeleton />}>
              <OverviewWeek searchParams={searchParams} />
            </Suspense>
          }
          activity={
            <Suspense fallback={<ActivitySkeleton />}>
              <OverviewActivity searchParams={searchParams} />
            </Suspense>
          }
        />
      </Suspense>
    </AdminPageShell>
  );
}

async function OverviewFrame({
  tiles,
  attention,
  week,
  activity,
}: {
  tiles: ReactNode;
  attention: ReactNode;
  week: ReactNode;
  activity: ReactNode;
}) {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [viewer, dict] = await Promise.all([adminViewer(), getDictionary()]);
  const strings = dict.admin.reports.overview;
  const overview = dict.admin.overview;

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
      <OverviewColumns
        attention={
          <OverviewSection
            id="overview-attention"
            title={overview.attention.title}
          >
            {attention}
          </OverviewSection>
        }
        week={
          <OverviewSection
            id="overview-week"
            title={overview.week.title}
          >
            {week}
          </OverviewSection>
        }
        activity={
          <OverviewSection
            id="overview-activity"
            title={overview.activity.title}
          >
            {activity}
          </OverviewSection>
        }
      />
    </>
  );
}

function OverviewColumns({
  attention,
  week,
  activity,
}: {
  attention: ReactNode;
  week: ReactNode;
  activity: ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
      <div className="min-w-0">{attention}</div>
      <div className="min-w-0">{week}</div>
      <aside className="min-w-0 lg:col-span-2 xl:col-span-1 xl:border-l xl:border-line xl:pl-6">
        {activity}
      </aside>
    </div>
  );
}

function OverviewSection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col">
        <h2
          id={id}
          className="text-sm font-medium"
        >
          {title}
        </h2>
        {subtitle ? <p className="text-xs text-ink-soft">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SectionHeadingSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
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
      <OverviewColumns
        attention={
          <div className="flex flex-col gap-3">
            <SectionHeadingSkeleton />
            <AttentionSkeleton />
          </div>
        }
        week={
          <div className="flex flex-col gap-3">
            <SectionHeadingSkeleton />
            <WeekSkeleton />
          </div>
        }
        activity={
          <div className="flex flex-col gap-3">
            <SectionHeadingSkeleton />
            <ActivitySkeleton />
          </div>
        }
      />
    </>
  );
}
