import { Suspense } from "react";
import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import { RideWeek } from "@/features/rides/components/ride-week";
import { wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { PageFallback } from "@/components/page-fallback";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { hrefWith } from "../_components/href-with";
import { WeekSwitcher } from "../_components/week-switcher";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { readCalendarWeek } from "../calendar-week";
import { ALLOCATION_PARAM } from "./_components/allocation-param";
import { TrishawAllocation } from "./_components/trishaw-allocation";

export default function RidesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PageFallback />}>
        <Rides searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <TrishawAllocation searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Rides({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { scopeQuery, chapterIds } = await readActiveScope(
    searchParams,
    "rides",
  );
  const [params, dict, language, head, zones] = await Promise.all([
    searchParams,
    getDictionary(),
    getLocale(),
    headers(),
    chapterFeature.getChapterTimeZones(chapterIds),
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

  const allocationHref = (rideId: string) =>
    hrefWith("/admin/rides", params, { [ALLOCATION_PARAM]: rideId });

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.rides.title}>
        <WeekSwitcher
          pathname="/admin/rides"
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
        <RideWeek
          rides={weekRides}
          anchor={anchor}
          timeZone={timeZone}
          weekStartsOn={weekStartsOn}
          strings={dict.calendar}
          locale={locale}
          words={wordsLocale(language)}
          now={now}
          fleet={{
            grounded: dict.fleet.common.grounded,
            groundedOnRide: dict.fleet.allocation.groundedOnRide,
          }}
          allocate={{
            href: allocationHref,
            label: dict.fleet.allocation.open,
          }}
        />
      </div>
    </>
  );
}
