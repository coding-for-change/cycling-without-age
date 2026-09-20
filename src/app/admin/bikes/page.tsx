import { Suspense } from "react";
import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import { rides } from "@/features/rides";
import { TrishawTimeline } from "@/features/rides/components/trishaw-timeline";
import { addDays, firstDayOfWeek, startOfWeek } from "@/lib/calendar";
import { resolveLocale } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { PageFallback } from "@/components/page-fallback";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { WeekSwitcher } from "../_components/week-switcher";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { calendarTimeZone } from "../calendar-scope";
import { readWeekAnchor } from "../week-param";

export default function BikesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PageFallback />}>
        <Bikes searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Bikes({
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
    rides.listTrishaws(chapterIds),
  ]);

  const locale = resolveLocale(head.get("accept-language"));
  const weekStartsOn = firstDayOfWeek(locale);
  const { timeZone, label } = calendarTimeZone(zones);
  const now = new Date();
  const anchor = readWeekAnchor(params.week, timeZone, weekStartsOn, now);
  const weekStart = startOfWeek(anchor, timeZone, weekStartsOn);

  const weekRides = await rides.listRidesInRange(
    chapterIds,
    weekStart,
    addDays(weekStart, 7, timeZone),
  );

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.bikes.title}>
        <WeekSwitcher
          pathname="/admin/bikes"
          scopeQuery={scopeQuery}
          anchor={anchor}
          timeZone={timeZone}
          strings={dict.calendar}
          locale={locale}
          now={now}
        />
      </AdminPageHeader>
      {label ? <p className="text-2sm text-ink-soft -mt-3">{label}</p> : null}
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
