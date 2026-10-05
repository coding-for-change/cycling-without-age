import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { activityKpis } from "@/use-cases/activity-report";
import { getDictionary, getLocale } from "@/lib/i18n";
import { resolveLocale } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminPageHeader, AdminPageShell } from "./_components/admin-page";
import {
  KpiTilesSkeleton,
  PageHeaderSkeleton,
} from "./_components/admin-skeletons";
import { hrefWith } from "./_components/href-with";
import {
  isTrendMetric,
  kpiTiles,
  type KpiMetric,
} from "./_components/kpi-data";
import { KpiTiles } from "./_components/kpi-tiles";
import { readActiveScope, type AdminSearchParams } from "./active-scope";

export default function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Overview({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
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
  const reports = hrefWith("/admin/reports", scopeQuery, {});
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
    <>
      <AdminPageHeader title={dict.admin.pages.overview.title}>
        <Link
          href={reports}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-2sm",
          )}
        >
          {strings.overview.open}
          <ArrowRight
            aria-hidden
            className="size-4"
          />
        </Link>
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
            {strings.overview.title}
          </h2>
          <p className="text-xs text-ink-soft">{strings.overview.subtitle}</p>
        </div>
        <KpiTiles
          tiles={tiles}
          locale={notation}
          language={language}
          strings={strings.kpis}
          deltaStrings={strings.delta}
          hrefs={hrefs}
        />
      </section>
    </>
  );
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
