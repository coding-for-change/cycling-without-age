import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { chapters as chapterFeature } from "@/features/chapters";
import { rides as rideFeature } from "@/features/rides";
import {
  RideList,
  RideListSkeleton,
} from "@/features/rides/components/ride-list";
import { toListPage } from "@/features/rides/components/ride-list-rows";
import { RideWeek } from "@/features/rides/components/ride-week";
import { RideWeekSkeleton } from "@/features/rides/components/ride-week-skeleton";
import {
  addDays,
  dayKey,
  firstDayOfWeek,
  startOfWeek,
  weekDays,
} from "@/lib/calendar";
import { resolveLocale, wordsLocale, type Locale } from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { first, hrefWith } from "@/lib/search-params";
import { StickyToolbar } from "../_components/sticky-toolbar";
import { WeekSwitcher } from "../_components/week-switcher";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { calendarTimeZone } from "../calendar-scope";
import {
  dayNeighbours,
  readDayParam,
  readWeekAnchor,
  weekParam,
} from "../week-param";
import { listRidesPageAction } from "@/features/rides/actions";
import { rideErrors } from "@/features/rides/components/strings";
import {
  RidesViewSwitch,
  type RidesView,
} from "./_components/rides-view-switch";
import { RidesSkeleton } from "./_components/rides-skeleton";
import { ScheduleRide } from "./_components/schedule-ride";

const LIST_PAGE = 30;

const TRANSIENT = {
  new: null,
  date: null,
  start: null,
  end: null,
} as const;

export default function RidesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<RidesSkeleton />}>
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

  const [dict, language, head, zones] = await Promise.all([
    getDictionary(),
    getLocale(),
    headers(),
    chapterFeature.getChapterTimeZones(chapterIds),
  ]);

  const locale = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const weekStartsOn = firstDayOfWeek(locale);
  const { timeZone, label } = calendarTimeZone(zones);
  const now = new Date();
  const view: RidesView = first(params.view) === "list" ? "list" : "calendar";
  const anchor = readWeekAnchor(params.week, timeZone, weekStartsOn, now);
  const week = weekParam(anchor, timeZone);
  const strings = dict.rides.week;

  const hrefs: Record<RidesView, string> = {
    calendar: hrefWith("/admin/rides", params, { ...TRANSIENT, view: null }),
    list: hrefWith("/admin/rides", params, {
      ...TRANSIENT,
      view: "list",
      week: null,
      day: null,
    }),
  };

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.rides.title} />
      <div className="-mt-3 flex flex-col gap-3">
        <StickyToolbar label={strings.toolbar}>
          <div className="flex h-8 items-center gap-3">
            <RidesViewSwitch
              value={view}
              hrefs={hrefs}
              strings={{
                label: strings.view,
                calendar: strings.views.calendar,
                list: strings.views.list,
              }}
            />
            {view === "calendar" ? (
              <div className="min-w-0 max-lg:[&_p]:hidden">
                <WeekSwitcher
                  pathname="/admin/rides"
                  scopeQuery={scopeQuery}
                  anchor={anchor}
                  timeZone={timeZone}
                  strings={dict.calendar}
                  locale={locale}
                  now={now}
                />
              </div>
            ) : null}
            {chapterIds.length > 0 ? (
              <Button
                asChild
                variant="brand"
                size="sm"
                className="ml-auto h-8"
              >
                <Link
                  href={hrefWith("/admin/rides", params, {
                    ...TRANSIENT,
                    new: "1",
                  })}
                  aria-label={dict.admin.newRide}
                >
                  <Plus aria-hidden />
                  <span className="max-sm:hidden">{dict.admin.newRide}</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </StickyToolbar>
        {label ? <p className="text-2sm text-ink-soft">{label}</p> : null}
        <Suspense
          key={view === "list" ? "list" : `calendar:${week}`}
          fallback={
            view === "list" ? <RideListSkeleton /> : <RideWeekSkeleton />
          }
        >
          {view === "list" ? (
            <ListBody
              chapterIds={chapterIds}
              params={params}
              timeZone={timeZone}
              locale={locale}
              words={words}
              now={now}
              dict={dict}
            />
          ) : (
            <CalendarBody
              chapterIds={chapterIds}
              params={params}
              timeZone={timeZone}
              weekStartsOn={weekStartsOn}
              anchor={anchor}
              locale={locale}
              words={words}
              now={now}
              dict={dict}
            />
          )}
        </Suspense>
      </div>
    </>
  );
}

async function CalendarBody({
  chapterIds,
  params,
  timeZone,
  weekStartsOn,
  anchor,
  locale,
  words,
  now,
  dict,
}: {
  chapterIds: string[];
  params: AdminSearchParams;
  timeZone: string;
  weekStartsOn: number;
  anchor: Date;
  locale: Locale;
  words: Locale;
  now: Date;
  dict: Dictionary;
}) {
  const weekStart = startOfWeek(anchor, timeZone, weekStartsOn);
  const weekRides = await rideFeature.listRidesInRange(
    chapterIds,
    weekStart,
    addDays(weekStart, 7, timeZone),
  );

  const keys = weekDays(anchor, timeZone, weekStartsOn).map((day) =>
    dayKey(day, timeZone),
  );
  const week = weekParam(anchor, timeZone);
  const selected = readDayParam(params.day, keys, dayKey(now, timeZone));
  const neighbours = dayNeighbours(selected, timeZone, weekStartsOn);
  const dayHref = (day: string, inWeek: string) =>
    hrefWith("/admin/rides", params, {
      ...TRANSIENT,
      view: null,
      week: inWeek,
      day,
    });

  const rideHref = (rideId: string) =>
    hrefWith(`/admin/rides/${rideId}`, params, TRANSIENT);

  const strings = dict.rides.week;

  return (
    <div className="-mx-4 md:mx-0">
      <RideWeek
        rides={weekRides}
        anchor={anchor}
        timeZone={timeZone}
        weekStartsOn={weekStartsOn}
        strings={dict.calendar}
        locale={locale}
        words={words}
        now={now}
        fleet={{
          grounded: dict.fleet.common.grounded,
          groundedOnRide: dict.fleet.allocation.groundedOnRide,
        }}
        link={{
          href: rideHref,
          open: strings.open,
          cancelled: strings.cancelledHint,
        }}
        interaction={{
          resize: strings.resize,
          save: {
            saved: strings.moved,
            undo: dict.common.field.undo,
            undone: strings.movedBack,
            errors: rideErrors(dict),
          },
        }}
        dayNav={{
          selected,
          days: Object.fromEntries(
            keys.map((key) => [key, dayHref(key, week)]),
          ),
          previous: dayHref(neighbours.previous.day, neighbours.previous.week),
          next: dayHref(neighbours.next.day, neighbours.next.week),
          previousLabel: strings.previousDay,
          nextLabel: strings.nextDay,
        }}
      />
    </div>
  );
}

async function ListBody({
  chapterIds,
  params,
  timeZone,
  locale,
  words,
  now,
  dict,
}: {
  chapterIds: string[];
  params: AdminSearchParams;
  timeZone: string;
  locale: Locale;
  words: Locale;
  now: Date;
  dict: Dictionary;
}) {
  const page = await rideFeature.listRidesForList(
    { chapterIds, limit: LIST_PAGE },
    now,
  );
  const { list } = dict.rides;
  const calendar = dict.calendar;

  return (
    <RideList
      initial={toListPage(page)}
      chapterIds={chapterIds}
      timeZone={timeZone}
      locale={locale}
      words={words}
      now={now}
      query={hrefWith("", params, TRANSIENT)}
      loadPage={listRidesPageAction}
      strings={{
        ...list,
        riders: calendar.riders,
        pilotNeeded: calendar.pilotNeeded,
        noTrishaw: calendar.noTrishaw,
        grounded: dict.fleet.common.grounded,
        via: calendar.via,
        models: calendar.models,
        statuses: calendar.statuses,
      }}
    />
  );
}
