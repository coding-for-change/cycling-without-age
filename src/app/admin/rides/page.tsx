import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import {
  ALLOCATION_OPEN,
  ALLOCATION_PARAM,
} from "./_components/allocation-param";
import { ScheduleRide } from "./_components/schedule-ride";

const RIDE_ID = /^[A-Za-z0-9_-]{1,64}$/;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

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
        <ScheduleRide searchParams={searchParams} />
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
  const params = await searchParams;
  const allocating = first(params[ALLOCATION_PARAM]);
  if (allocating && allocating !== ALLOCATION_OPEN && RIDE_ID.test(allocating))
    redirect(
      hrefWith(`/admin/rides/${allocating}`, params, {
        [ALLOCATION_PARAM]: "1",
      }),
    );

  const [dict, language, head, zones] = await Promise.all([
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

  const rideHref = (rideId: string) =>
    hrefWith(`/admin/rides/${rideId}`, params, {
      new: null,
      [ALLOCATION_PARAM]: null,
    });

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
        {chapterIds.length > 0 ? (
          <Button
            asChild
            variant="brand"
            className="min-h-11"
          >
            <Link href={hrefWith("/admin/rides", params, { new: "1" })}>
              <Plus aria-hidden />
              {dict.admin.newRide}
            </Link>
          </Button>
        ) : null}
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
          link={{
            href: rideHref,
            open: dict.rides.week.open,
            cancelled: dict.rides.week.cancelledHint,
          }}
        />
      </div>
    </>
  );
}
