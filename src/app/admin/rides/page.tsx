import { Suspense } from "react";
import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import { rides } from "@/features/rides";
import { RideWeek } from "@/features/rides/components/ride-week";
import { addDays, firstDayOfWeek, startOfWeek } from "@/lib/calendar";
import { resolveLocale, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import {
  AdminPageFallback,
  AdminPageHeader,
  AdminPageShell,
} from "../_components/admin-page";
import { WeekSwitcher } from "../_components/week-switcher";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { calendarTimeZone } from "../calendar-scope";
import { readWeekAnchor } from "../week-param";

export default function RidesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <Rides searchParams={searchParams} />
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

  const locale = resolveLocale(head.get("accept-language"));
  const weekStartsOn = firstDayOfWeek(locale);
  const { timeZone, label } = calendarTimeZone(zones);
  const now = new Date();
  const anchor = readWeekAnchor(params.week, timeZone, weekStartsOn, now);

  const weekRides = await rides.listRidesInRange(
    chapterIds,
    startOfWeek(anchor, timeZone, weekStartsOn),
    addDays(startOfWeek(anchor, timeZone, weekStartsOn), 7, timeZone),
  );

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
      <RideWeek
        rides={weekRides}
        anchor={anchor}
        timeZone={timeZone}
        weekStartsOn={weekStartsOn}
        strings={dict.calendar}
        locale={locale}
        words={wordsLocale(language)}
        now={now}
      />
    </>
  );
}
