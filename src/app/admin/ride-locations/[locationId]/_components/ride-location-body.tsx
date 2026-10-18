import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { markdownToolLabels } from "@/components/markdown-editor";
import { BOOKING_CHOICES } from "@/features/chapters/schemas";
import { rideLocations } from "@/features/ride-locations";
import { id as rideLocationId } from "@/features/ride-locations/schemas";
import { rides } from "@/features/rides";
import { requireChapterAdmin } from "@/lib/auth-guards";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  resolveLocale,
  wordsLocale,
} from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MAP_ENABLED } from "@/lib/mapbox-map";
import { hrefWith } from "@/lib/search-params";
import { BackLink } from "../../../_components/detail-page";
import {
  readActiveScope,
  scopeQuery as scopeQueryOf,
  type AdminSearchParams,
} from "../../../active-scope";
import { RideLocationDetail } from "./ride-location-detail";

export async function RideLocationBody({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  const [{ scope, scopeQuery }, { locationId }] = await Promise.all([
    readActiveScope(searchParams, "rideLocations"),
    params,
  ]);
  if (!rideLocationId.safeParse(locationId).success) notFound();

  const location = await rideLocations.getRideLocation(locationId);
  if (!location) notFound();
  await requireChapterAdmin(location.chapterId);

  const [upcoming, dict, language, head] = await Promise.all([
    rides.listUpcomingRidesAt(location.id),
    getDictionary(),
    getLocale(),
    headers(),
  ]);

  const strings = dict.admin.rideLocations;
  const notation = resolveLocale(head.get("accept-language"));
  const words = wordsLocale(language);
  const backHref = `/admin/ride-locations${scopeQuery}`;
  const home = scope.chapters.find(
    (chapter) => chapter.id === location.chapterId,
  );

  return (
    <>
      <BackLink
        href={backHref}
        label={strings.detail.back}
      />
      <RideLocationDetail
        location={{
          id: location.id,
          kind: location.kind,
          name: location.name,
          chapterName: location.chapterName,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          contactName: location.contactName,
          contactPhone: location.contactPhone,
          contactEmail: location.contactEmail,
          notes: location.notes,
          typicalRideKm: location.typicalRideKm,
          defaultMinutes: location.defaultMinutes,
          archived: location.archivedAt !== null,
          added: formatMessage(
            strings.detail.added,
            { date: formatDate(location.createdAt, notation) },
            words,
          ),
        }}
        upcoming={upcoming.map((ride) => ({
          id: ride.id,
          href: hrefWith(`/admin/rides/${ride.id}`, scopeQuery, {}),
          when: formatDateTime(ride.startsAt, notation, location.timeZone),
          title: ride.title ?? dict.calendar.models[ride.model],
          riders: formatMessage(
            strings.detail.riders,
            { count: ride._count.roster },
            words,
          ),
        }))}
        scheduleHref={hrefWith(
          "/admin/rides",
          home ? scopeQueryOf({ kind: "chapter", chapter: home }) : scopeQuery,
          { new: "1", rideLocation: location.id },
        )}
        minutes={BOOKING_CHOICES.rideMinutes.map((value) => ({
          value,
          label: formatDuration(value * 60, words),
        }))}
        mapEnabled={MAP_ENABLED}
        language={language}
        backHref={backHref}
        labels={{
          strings,
          field: dict.common.field,
          address: dict.common.address,
          errors: { ...dict.common.errors, ...strings.errors },
          markdown: markdownToolLabels(dict),
        }}
      />
    </>
  );
}
