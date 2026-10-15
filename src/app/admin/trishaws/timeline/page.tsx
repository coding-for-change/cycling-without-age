import { Suspense, cache } from "react";
import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import {
  foreignBooking,
  TrishawTimeline,
  type TimelineRide,
} from "@/features/rides/components/trishaw-timeline";
import { getDictionary } from "@/lib/i18n";
import { AdminPageShell } from "../../_components/admin-page";
import { WeekSwitcher } from "../../_components/week-switcher";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { scopeCountries } from "../../scope-countries";
import { readCalendarWeek } from "../../calendar-week";
import { FleetHeader } from "../_components/fleet-header";
import {
  FleetActionSkeleton,
  FleetHeaderSkeleton,
  WEEK_SWITCHER,
} from "../_components/trishaws-skeleton";
import { TimelineGridSkeleton } from "./_components/timeline-skeleton";

type PageProps = { searchParams: Promise<AdminSearchParams> };

export default function TrishawTimelinePage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<FleetHeaderSkeleton action={WEEK_SWITCHER} />}>
        <FleetHeader
          current="timeline"
          action={
            <Suspense
              fallback={<FleetActionSkeleton className={WEEK_SWITCHER} />}
            >
              <TimelineWeekSwitcher searchParams={searchParams} />
            </Suspense>
          }
        />
      </Suspense>
      <Suspense fallback={<TimelineGridSkeleton />}>
        <Timeline searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

const loadTimeline = cache(async (searchParams: Promise<AdminSearchParams>) => {
  const { scope, active, scopeQuery, chapterIds } = await readActiveScope(
    searchParams,
    "bikes",
  );
  const poolCountryIds = scopeCountries(scope, active).map(
    (country) => country.id,
  );
  const [params, dict, head, zones, trishaws] = await Promise.all([
    searchParams,
    getDictionary(),
    headers(),
    chapterFeature.getChapterTimeZones(chapterIds),
    fleet.listTrishaws(chapterIds, poolCountryIds),
  ]);

  const week = await readCalendarWeek({
    week: params.week,
    zones,
    head,
    chapterIds: [
      ...new Set([
        ...chapterIds,
        ...trishaws.flatMap(fleet.chapterIdsReaching),
      ]),
    ],
  });
  const administered = new Set(scope.chapters.map((chapter) => chapter.id));
  const listed = new Set(trishaws.map((trishaw) => trishaw.id));
  const rides = week.rides.flatMap<TimelineRide>((ride) =>
    administered.has(ride.chapterId)
      ? [ride]
      : ride.status === "cancelled"
        ? []
        : [foreignBooking(ride, listed)],
  );

  return { scopeQuery, dict, trishaws, rides, week };
});

async function TimelineWeekSwitcher({ searchParams }: PageProps) {
  const { scopeQuery, dict, week } = await loadTimeline(searchParams);

  return (
    <WeekSwitcher
      pathname="/admin/trishaws/timeline"
      scopeQuery={scopeQuery}
      anchor={week.anchor}
      timeZone={week.timeZone}
      strings={dict.calendar}
      locale={week.locale}
      now={week.now}
    />
  );
}

async function Timeline({ searchParams }: PageProps) {
  const { dict, trishaws, rides, week } = await loadTimeline(searchParams);

  return (
    <>
      {week.label ? (
        <p className="text-2sm text-ink-soft">{week.label}</p>
      ) : null}
      <div className="-mx-4 md:mx-0">
        <TrishawTimeline
          trishaws={trishaws}
          rides={rides}
          anchor={week.anchor}
          timeZone={week.timeZone}
          weekStartsOn={week.weekStartsOn}
          strings={dict.calendar}
          locale={week.locale}
          now={week.now}
        />
      </div>
    </>
  );
}
