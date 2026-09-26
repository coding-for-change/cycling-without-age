import Link from "next/link";
import { Suspense } from "react";
import { KeyRound, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markdownToolLabels } from "@/components/markdown-editor";
import { fleet, type LocationRow } from "@/features/fleet";
import { wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MAP_ENABLED } from "@/lib/mapbox-map";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { AdminTabs } from "../_components/admin-tabs";
import { DetailSection } from "../_components/detail-page";
import { hrefWith } from "../_components/href-with";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { scopeCountries } from "../scope-countries";
import { LocationCreateDrawer } from "./_components/location-create-drawer";
import {
  EmptyRow,
  LocationRowLink,
  RowList,
} from "./_components/location-list";
import { LocationsSkeleton } from "./_components/locations-skeleton";
import { PoolJoinDrawer } from "./_components/pool-join-drawer";
import { PoolLeaveButton } from "./_components/pool-leave-button";
import { locationTabs, waitingRequests } from "./pool-countries";

export default function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<LocationsSkeleton />}>
        <Locations searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Locations({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
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

  const strings = dict.fleet.locations;
  const common = dict.fleet.common;
  const words = wordsLocale(language);
  const multiChapter = chapters.length > 1;
  const detailHref = (id: string) => `/admin/locations/${id}${scopeQuery}`;

  const trishawCount = (location: LocationRow) =>
    formatMessage(
      strings.trishawCount,
      { count: location._count.trishaws },
      words,
    );

  const own = reachable.filter((location) => location.kind === "chapter");
  const reachablePools = new Map(
    reachable
      .filter((location) => location.kind === "pool")
      .map((pool) => [pool.id, pool]),
  );
  const used = memberships.filter(
    (m) => m.status === "approved" && m.storageLocation.kind === "pool",
  );
  const decidedHere = new Set(scope.countries.map((country) => country.id));
  const requests = memberships.filter(
    (m) =>
      m.status !== "approved" &&
      m.storageLocation.kind === "pool" &&
      !decidedHere.has(m.storageLocation.countryId ?? ""),
  );
  const chapterOptions = chapters.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <AdminPageHeader title={strings.title}>
        {chapters.length > 0 ? (
          <Button
            asChild
            variant="outline"
            className="min-h-11 border-line"
          >
            <Link
              href={hrefWith("/admin/locations", scopeQuery, { join: "1" })}
            >
              <KeyRound aria-hidden />
              {strings.actions.join}
            </Link>
          </Button>
        ) : null}
        {chapters.length > 0 ? (
          <Button
            asChild
            variant="brand"
            className="min-h-11"
          >
            <Link
              href={hrefWith("/admin/locations", scopeQuery, {
                new: "location",
              })}
            >
              <Plus aria-hidden />
              {strings.actions.newLocation}
            </Link>
          </Button>
        ) : null}
      </AdminPageHeader>

      {countries.length > 0 ? (
        <AdminTabs
          tabs={locationTabs(strings.tabs, waitingRequests(pools))}
          current="locations"
          scopeQuery={scopeQuery}
          label={strings.tabs.label}
        />
      ) : null}

      <div className="grid gap-10">
        <DetailSection
          bordered={false}
          title={strings.sections.own}
          description={strings.sections.ownBody}
        >
          {own.length > 0 ? (
            <RowList>
              {own.map((location) => (
                <LocationRowLink
                  key={location.id}
                  href={detailHref(location.id)}
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
          ) : (
            <EmptyRow>{strings.empty.own}</EmptyRow>
          )}
        </DetailSection>

        <DetailSection
          bordered={false}
          title={strings.sections.used}
          description={strings.sections.usedBody}
        >
          {used.length > 0 ? (
            <RowList>
              {used.map((membership) => {
                const pool = reachablePools.get(membership.storageLocationId);
                const chapter = membership.chapter.name;
                return (
                  <LocationRowLink
                    key={membership.id}
                    pool
                    href={detailHref(membership.storageLocationId)}
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
          ) : (
            <EmptyRow>{strings.empty.used}</EmptyRow>
          )}
        </DetailSection>

        {requests.length > 0 ? (
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
                    <p className="rounded-xl bg-mint-tint px-3 py-2 text-2sm whitespace-pre-wrap text-ink">
                      {request.decisionNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </RowList>
          </DetailSection>
        ) : null}
      </div>

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
