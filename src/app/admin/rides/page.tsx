import { Suspense, cache, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
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
import { StickyToolbarSkeleton } from "../_components/sticky-toolbar";
import { WeekSwitcher } from "../_components/week-switcher";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { ADMIN_LIFE, adminViewer } from "../admin-viewer";
import { calendarTimeZone } from "../calendar-scope";
import {
  dayNeighbours,
  readDayParam,
  readWeekAnchor,
  weekParam,
} from "../week-param";
import { listRidesPageAction } from "@/features/rides/actions";
import { rideErrors } from "@/features/rides/components/strings";
import { RidesBodyFallback, RidesToolbar } from "./_components/rides-header";
import {
  RidesSkeleton,
  WeekSwitcherSkeleton,
} from "./_components/rides-skeleton";
import { RideTabs, RideTabsSkeleton } from "./_components/ride-tabs";
import { RequestsWaiting } from "./_components/requests-waiting";
import { ScheduleRide } from "./_components/schedule-ride";
import { TRANSIENT, ridesView } from "./rides-view";

const LIST_PAGE = 30;

type PageProps = { searchParams: Promise<AdminSearchParams> };

export default function RidesPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<RidesSkeleton />}>
        <RidesFrame
          tabs={
            <Suspense fallback={<RideTabsSkeleton />}>
              <RideTabs
                searchParams={searchParams}
                current="rides"
              />
            </Suspense>
          }
          weekSwitcher={
            <Suspense fallback={<WeekSwitcherSkeleton />}>
              <RidesWeekSwitcher searchParams={searchParams} />
            </Suspense>
          }
          body={
            <Suspense
              fallback={
                <Suspense fallback={<RideWeekSkeleton />}>
                  <RidesBodyFallback />
                </Suspense>
              }
            >
              <RidesBody searchParams={searchParams} />
            </Suspense>
          }
        />
      </Suspense>
      <Suspense fallback={null}>
        <ScheduleRide searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function RidesFrame({
  tabs,
  weekSwitcher,
  body,
}: {
  tabs: ReactNode;
  weekSwitcher: ReactNode;
  body: ReactNode;
}) {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [viewer, dict] = await Promise.all([adminViewer(), getDictionary()]);
  const strings = dict.rides.week;

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.rides.title} />
      {tabs}
      <div className="-mt-3 flex flex-col gap-3">
        <Suspense fallback={<StickyToolbarSkeleton />}>
          <RidesToolbar
            viewer={viewer}
            strings={{
              toolbar: strings.toolbar,
              view: strings.view,
              calendar: strings.views.calendar,
              list: strings.views.list,
              newRide: dict.admin.newRide,
            }}
            weekSwitcher={weekSwitcher}
          />
        </Suspense>
        {body}
      </div>
    </>
  );
}

const loadRides = cache(async (searchParams: Promise<AdminSearchParams>) => {
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
  const weekStartsOn = firstDayOfWeek(locale);
  const { timeZone, label } = calendarTimeZone(zones);
  const now = new Date();
  const anchor = readWeekAnchor(params.week, timeZone, weekStartsOn, now);

  return {
    scopeQuery,
    chapterIds,
    params,
    dict,
    locale,
    words: wordsLocale(language),
    weekStartsOn,
    timeZone,
    label,
    now,
    anchor,
    week: weekParam(anchor, timeZone),
    view: ridesView(first(params.view)),
  };
});

async function RidesWeekSwitcher({ searchParams }: PageProps) {
  const { view, scopeQuery, anchor, timeZone, dict, locale, now } =
    await loadRides(searchParams);
  if (view === "list") return null;

  return (
    <WeekSwitcher
      pathname="/admin/rides"
      scopeQuery={scopeQuery}
      anchor={anchor}
      timeZone={timeZone}
      strings={dict.calendar}
      locale={locale}
      now={now}
    />
  );
}

async function RidesBody({ searchParams }: PageProps) {
  const {
    scopeQuery,
    view,
    week,
    label,
    chapterIds,
    params,
    timeZone,
    weekStartsOn,
    anchor,
    locale,
    words,
    now,
    dict,
  } = await loadRides(searchParams);

  return (
    <>
      {label ? <p className="text-2sm text-ink-soft">{label}</p> : null}
      <RequestsWaiting
        chapterIds={chapterIds}
        scopeQuery={scopeQuery}
      />
      <Suspense
        key={view === "list" ? "list" : `calendar:${week}`}
        fallback={view === "list" ? <RideListSkeleton /> : <RideWeekSkeleton />}
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
  const [weekRides, hours] = await Promise.all([
    rideFeature.listRidesInRange(
      chapterIds,
      weekStart,
      addDays(weekStart, 7, timeZone),
    ),
    chapterIds.length === 1
      ? chapterFeature.getOperatingHours(chapterIds[0], weekStart)
      : undefined,
  ]);

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
        openingHours={hours}
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
