import { Suspense } from "react";
import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { TrishawTimeline } from "@/features/rides/components/trishaw-timeline";
import { getDictionary } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../../_components/admin-page";
import { AdminTabs } from "../../_components/admin-tabs";
import { WeekSwitcher } from "../../_components/week-switcher";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { readCalendarWeek } from "../../calendar-week";
import { fleetTabs } from "../_components/options";
import { TimelineSkeleton } from "./_components/timeline-skeleton";

export default function TrishawTimelinePage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<TimelineSkeleton />}>
        <Timeline searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Timeline({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { scopeQuery, chapterIds } = await readActiveScope(
    searchParams,
    "bikes",
  );
  const [params, dict, head, zones, trishaws] = await Promise.all([
    searchParams,
    getDictionary(),
    headers(),
    chapterFeature.getChapterTimeZones(chapterIds),
    fleet.listTrishaws(chapterIds),
  ]);

  const {
    locale,
    weekStartsOn,
    timeZone,
    label,
    now,
    anchor,
    rides: weekRides,
  } = await readCalendarWeek({ week: params.week, zones, head, chapterIds });

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.bikes.title}>
        <WeekSwitcher
          pathname="/admin/trishaws/timeline"
          scopeQuery={scopeQuery}
          anchor={anchor}
          timeZone={timeZone}
          strings={dict.calendar}
          locale={locale}
          now={now}
        />
      </AdminPageHeader>
      <AdminTabs
        tabs={fleetTabs(dict.fleet.trishaws.tabs)}
        current="timeline"
        scopeQuery={scopeQuery}
        label={dict.fleet.trishaws.tabs.label}
      />
      {label ? <p className="text-2sm text-ink-soft">{label}</p> : null}
      <div className="-mx-4 md:mx-0">
        <TrishawTimeline
          trishaws={trishaws}
          rides={weekRides}
          anchor={anchor}
          timeZone={timeZone}
          weekStartsOn={weekStartsOn}
          strings={dict.calendar}
          locale={locale}
          now={now}
        />
      </div>
    </>
  );
}
