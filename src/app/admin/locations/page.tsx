import { Suspense, cache, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { markdownToolLabels } from "@/components/markdown-editor";
import { fleet, type LocationRow } from "@/features/fleet";
import { wordsLocale } from "@/lib/format";
import { getDictionary, getLocale, type Dictionary } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MAP_ENABLED } from "@/lib/mapbox-map";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { TabCount } from "../_components/admin-tabs";
import { DetailSection } from "../_components/detail-page";
import { TimelineBubble } from "../_components/timeline";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { ADMIN_LIFE, adminViewer } from "../admin-viewer";
import { scopeCountries } from "../scope-countries";
import { LocationCreateDrawer } from "./_components/location-create-drawer";
import {
  EmptyRow,
  LocationRowLink,
  RowList,
} from "./_components/location-list";
import {
  LocationsActions,
  LocationsTabs,
} from "./_components/locations-header";
import {
  LocationActionsSkeleton,
  LocationRowsSkeleton,
  LocationSectionsSkeleton,
  LocationsHeaderSkeleton,
} from "./_components/locations-skeleton";
import { PoolJoinDrawer } from "./_components/pool-join-drawer";
import { PoolLeaveButton } from "./_components/pool-leave-button";
import { waitingRequests } from "./pool-countries";
import { fleetCommon } from "@/features/fleet/components/strings";

type PageProps = { searchParams: Promise<AdminSearchParams> };

export default function LocationsPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<LocationsHeaderSkeleton />}>
        <LocationsHeader
          poolsBadge={
            <Suspense fallback={null}>
              <PoolsBadge searchParams={searchParams} />
            </Suspense>
          }
        />
      </Suspense>
      <Suspense fallback={<LocationSectionsSkeleton />}>
        <LocationSections
          own={
            <Suspense fallback={<LocationRowsSkeleton />}>
              <OwnLocations searchParams={searchParams} />
            </Suspense>
          }
          used={
            <Suspense fallback={<LocationRowsSkeleton />}>
              <UsedPools searchParams={searchParams} />
            </Suspense>
          }
          requests={
            <Suspense fallback={null}>
              <PoolRequests searchParams={searchParams} />
            </Suspense>
          }
        />
      </Suspense>
      <Suspense fallback={null}>
        <LocationDrawers searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function LocationsHeader({ poolsBadge }: { poolsBadge: ReactNode }) {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [viewer, dict] = await Promise.all([adminViewer(), getDictionary()]);
  const strings = dict.fleet.locations;

  return (
    <>
      <AdminPageHeader title={strings.title}>
        <Suspense fallback={<LocationActionsSkeleton />}>
          <LocationsActions
            viewer={viewer}
            strings={strings.actions}
          />
        </Suspense>
      </AdminPageHeader>
      <Suspense fallback={null}>
        <LocationsTabs
          viewer={viewer}
          labels={strings.tabs}
          poolsBadge={poolsBadge}
        />
      </Suspense>
    </>
  );
}

async function LocationSections({
  own,
  used,
  requests,
}: {
  own: ReactNode;
  used: ReactNode;
  requests: ReactNode;
}) {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const strings = (await getDictionary()).fleet.locations;

  return (
    <div className="grid gap-10">
      <DetailSection
        bordered={false}
        title={strings.sections.own}
        description={strings.sections.ownBody}
      >
        {own}
      </DetailSection>
      <DetailSection
        bordered={false}
        title={strings.sections.used}
        description={strings.sections.usedBody}
      >
        {used}
      </DetailSection>
      {requests}
    </div>
  );
}

const loadLocations = cache(
  async (searchParams: Promise<AdminSearchParams>) => {
    const { scope, active, scopeQuery, chapters, chapterIds } =
      await readActiveScope(searchParams, "locations");
    const countries = scopeCountries(scope, active);

    const [reachable, memberships, pools, dict, language] = await Promise.all([
      fleet.listLocationsForChapters(chapterIds),
      fleet.listMembershipsOfChapters(chapterIds),
      fleet.listPools(countries.map((country) => country.id)),
      getDictionary(),
      getLocale(),
    ]);

    const decidedHere = new Set(scope.countries.map((country) => country.id));

    return {
      scopeQuery,
      chapters,
      pools,
      dict,
      language,
      reachable,
      used: memberships.filter(
        (m) => m.status === "approved" && m.storageLocation.kind === "pool",
      ),
      requests: memberships.filter(
        (m) =>
          m.status !== "approved" &&
          m.storageLocation.kind === "pool" &&
          !decidedHere.has(m.storageLocation.countryId ?? ""),
      ),
    };
  },
);

async function PoolsBadge({ searchParams }: PageProps) {
  const waiting = waitingRequests((await loadLocations(searchParams)).pools);
  return waiting ? <TabCount count={waiting} /> : null;
}

const trishawCounter =
  (
    strings: Dictionary["fleet"]["locations"],
    words: ReturnType<typeof wordsLocale>,
  ) =>
  (location: LocationRow) =>
    formatMessage(
      strings.trishawCount,
      { count: location._count.trishaws },
      words,
    );

async function OwnLocations({ searchParams }: PageProps) {
  const { dict, language, scopeQuery, chapters, reachable } =
    await loadLocations(searchParams);
  const strings = dict.fleet.locations;
  const trishawCount = trishawCounter(strings, wordsLocale(language));
  const multiChapter = chapters.length > 1;
  const own = reachable.filter((location) => location.kind === "chapter");

  if (own.length === 0) return <EmptyRow>{strings.empty.own}</EmptyRow>;

  return (
    <RowList>
      {own.map((location) => (
        <LocationRowLink
          key={location.id}
          href={`/admin/locations/${location.id}${scopeQuery}`}
          name={location.name}
          badge={location.isDefault ? strings.isDefault : undefined}
          meta={[
            multiChapter ? location.ownerChapter?.name : null,
            location.address ?? strings.noAddress,
          ]
            .filter(Boolean)
            .join(" · ")}
          count={trishawCount(location)}
        />
      ))}
    </RowList>
  );
}

async function UsedPools({ searchParams }: PageProps) {
  const { dict, language, scopeQuery, chapters, reachable, used } =
    await loadLocations(searchParams);
  const strings = dict.fleet.locations;
  const common = fleetCommon(dict);
  const words = wordsLocale(language);
  const trishawCount = trishawCounter(strings, words);
  const multiChapter = chapters.length > 1;
  const reachablePools = new Map(
    reachable
      .filter((location) => location.kind === "pool")
      .map((pool) => [pool.id, pool]),
  );

  if (used.length === 0) return <EmptyRow>{strings.empty.used}</EmptyRow>;

  return (
    <RowList>
      {used.map((membership) => {
        const pool = reachablePools.get(membership.storageLocationId);
        const chapter = membership.chapter.name;
        return (
          <LocationRowLink
            key={membership.id}
            pool
            href={`/admin/locations/${membership.storageLocationId}${scopeQuery}`}
            name={membership.storageLocation.name}
            meta={[
              multiChapter
                ? formatMessage(strings.forChapter, { chapter }, words)
                : null,
              pool?.address ?? strings.noAddress,
            ]
              .filter(Boolean)
              .join(" · ")}
            count={pool ? trishawCount(pool) : ""}
            action={
              <PoolLeaveButton
                poolId={membership.storageLocationId}
                poolName={membership.storageLocation.name}
                chapterId={membership.chapterId}
                chapterName={chapter}
                strings={strings}
                errors={common.errors}
                locale={language}
              />
            }
          />
        );
      })}
    </RowList>
  );
}

async function PoolRequests({ searchParams }: PageProps) {
  const { dict, language, chapters, requests } =
    await loadLocations(searchParams);
  if (requests.length === 0) return null;

  const strings = dict.fleet.locations;
  const words = wordsLocale(language);
  const multiChapter = chapters.length > 1;

  return (
    <DetailSection
      bordered={false}
      title={strings.sections.requests}
      description={strings.sections.requestsBody}
    >
      <RowList>
        {requests.map((request) => (
          <li
            key={request.id}
            className="grid gap-2 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {request.storageLocation.name}
              </span>
              <Badge
                className={
                  request.status === "pending"
                    ? "bg-mint-tint font-normal text-ink"
                    : "bg-canvas-deep font-normal text-ink-soft"
                }
              >
                {strings.requestStatus[request.status]}
              </Badge>
            </div>
            {multiChapter ? (
              <span className="text-2sm text-ink-soft">
                {formatMessage(
                  strings.forChapter,
                  { chapter: request.chapter.name },
                  words,
                )}
              </span>
            ) : null}
            {request.decisionNote ? (
              <TimelineBubble>{request.decisionNote}</TimelineBubble>
            ) : null}
          </li>
        ))}
      </RowList>
    </DetailSection>
  );
}

async function LocationDrawers({ searchParams }: PageProps) {
  const { dict, language, scopeQuery, chapters } =
    await loadLocations(searchParams);
  const strings = dict.fleet.locations;
  const common = fleetCommon(dict);
  const chapterOptions = chapters.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <LocationCreateDrawer
        markdown={markdownToolLabels(dict)}
        chapters={chapterOptions}
        countries={[]}
        scopeQuery={scopeQuery}
        mapEnabled={MAP_ENABLED}
        language={language}
        strings={strings}
        common={common}
      />
      <PoolJoinDrawer
        chapters={chapterOptions}
        strings={strings}
        common={common}
      />
    </>
  );
}
