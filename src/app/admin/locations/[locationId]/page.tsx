import { Suspense } from "react";
import { notFound } from "next/navigation";
import { markdownToolLabels } from "@/components/markdown-editor";
import { fleet } from "@/features/fleet";
import { allowsAdmin } from "@/lib/access";
import { requireAdminOf } from "@/lib/auth-guards";
import { wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MAP_ENABLED } from "@/lib/mapbox-map";
import { AdminPageShell } from "../../_components/admin-page";
import { BackLink } from "../../_components/detail-page";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { DetailSkeleton } from "../../_components/detail-skeleton";
import { locationOwnerName } from "../../trishaws/_components/options";
import { LocationDetail } from "./_components/location-detail";

export default function LocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<DetailSkeleton />}>
        <LocationBody
          params={params}
          searchParams={searchParams}
        />
      </Suspense>
    </AdminPageShell>
  );
}

async function LocationBody({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ session, scopeQuery }, { locationId }] = await Promise.all([
    readActiveScope(searchParams, "locations"),
    params,
  ]);

  const location = await fleet.getLocation(locationId);
  if (!location || location.archivedAt) notFound();
  await requireAdminOf(await fleet.locationReaders(location.id));

  const [authority, trishawIds, dict, language] = await Promise.all([
    fleet.locationAuthority(location.id),
    fleet.trishawIdsAt(location.id),
    getDictionary(),
    getLocale(),
  ]);
  const trishaws = await fleet.getTrishaws(trishawIds);

  const strings = dict.fleet.locations;
  const common = dict.fleet.common;
  const words = wordsLocale(language);
  const canManage = allowsAdmin(session.access, authority);
  const count = location._count.trishaws;
  const backHref =
    location.kind === "pool" && canManage
      ? `/admin/locations/pools${scopeQuery}`
      : `/admin/locations${scopeQuery}`;

  return (
    <>
      <BackLink
        href={backHref}
        label={
          location.kind === "pool" && canManage
            ? strings.pools.title
            : strings.back
        }
      />
      <LocationDetail
        markdown={markdownToolLabels(dict)}
        location={{
          id: location.id,
          kind: location.kind,
          name: location.name,
          isDefault: location.isDefault,
          poolCode: location.poolCode,
          membersMayManage: location.membersMayManage,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          entrance: location.entrance,
          entrancePhotoFileId: location.entrancePhotoFileId,
          accessCode: location.accessCode,
          accessNotes: location.accessNotes,
          returnInstructions: location.returnInstructions,
          ownerName: locationOwnerName(location),
          trishawCount: formatMessage(strings.trishawCount, { count }, words),
        }}
        trishaws={[...trishaws]
          .sort((a, b) => a.name.localeCompare(b.name, language))
          .map((trishaw) => ({
            id: trishaw.id,
            name: trishaw.name,
            status: common.statuses[trishaw.status],
            href: `/admin/trishaws/${trishaw.id}${scopeQuery}`,
          }))}
        members={
          location.kind === "pool" && canManage
            ? location.chapters.map((link) => ({
                membershipId: link.id,
                chapterId: link.chapterId,
                name: link.chapter.name,
                status: link.status,
              }))
            : null
        }
        canManage={canManage}
        mapEnabled={MAP_ENABLED}
        language={language}
        backHref={backHref}
        strings={strings}
        common={common}
      />
    </>
  );
}
