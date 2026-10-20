import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ICONS } from "@/components/icons";
import { markdownToolLabels } from "@/components/markdown-editor";
import { Button } from "@/components/ui/button";
import { BOOKING_CHOICES } from "@/features/chapters/schemas";
import { rideLocations } from "@/features/ride-locations";
import { rides } from "@/features/rides";
import { collator, formatDuration, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MAP_ENABLED } from "@/lib/mapbox-map";
import { hrefWith } from "@/lib/search-params";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { RideLocationCreateDrawer } from "./_components/ride-location-create-drawer";
import { RideLocationsSkeleton } from "./_components/ride-locations-skeleton";
import {
  RideLocationsTable,
  type RideLocationListRow,
} from "./_components/ride-locations-table";

export default function RideLocationsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<RideLocationsSkeleton />}>
        <RideLocations searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function RideLocations({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { scopeQuery, chapters, chapterIds } = await readActiveScope(
    searchParams,
    "rideLocations",
  );

  const [list, dict, language] = await Promise.all([
    rideLocations.listRideLocations(chapterIds, { includeArchived: true }),
    getDictionary(),
    getLocale(),
  ]);
  const upcoming = await rides.countRidesAt(
    list.map((location) => location.id),
  );

  const strings = dict.admin.rideLocations;
  const words = wordsLocale(language);
  const byName = collator(language);

  const rows: RideLocationListRow[] = list
    .map((location) => {
      const count = upcoming.get(location.id) ?? 0;
      return {
        id: location.id,
        name: location.name,
        kind: location.kind,
        address: location.address,
        contact:
          [location.contactName, location.contactPhone]
            .filter(Boolean)
            .join(" · ") || null,
        chapterName: location.chapterName,
        upcoming: count,
        upcomingLabel: formatMessage(strings.upcomingCount, { count }, words),
        archived: location.archivedAt !== null,
      };
    })
    .sort(
      (a, b) =>
        Number(a.archived) - Number(b.archived) ||
        byName.compare(a.name, b.name),
    );

  const chapterOptions = chapters
    .map((chapter) => ({ id: chapter.id, name: chapter.name }))
    .sort((a, b) => byName.compare(a.name, b.name));

  return (
    <>
      <AdminPageHeader title={strings.title}>
        {chapters.length > 0 ? (
          <Button
            asChild
            variant="brand"
            className="min-h-11"
          >
            <Link
              href={hrefWith("/admin/ride-locations", scopeQuery, { new: "1" })}
            >
              <Plus aria-hidden />
              {strings.new}
            </Link>
          </Button>
        ) : null}
      </AdminPageHeader>
      <p className="-mt-3 max-w-prose text-sm text-ink-soft">{strings.body}</p>

      {rows.length > 0 ? (
        <RideLocationsTable
          rows={rows}
          scopeQuery={scopeQuery}
          showChapter={chapters.length > 1}
          strings={strings}
          table={dict.admin.table}
          locale={language}
        />
      ) : (
        <EmptyState icon={ICONS.mapPin}>
          {chapters.length > 0 ? strings.empty : strings.pickChapter}
        </EmptyState>
      )}

      <RideLocationCreateDrawer
        chapters={chapterOptions}
        minutes={BOOKING_CHOICES.rideMinutes.map((value) => ({
          value,
          label: formatDuration(value * 60, words),
        }))}
        scopeQuery={scopeQuery}
        mapEnabled={MAP_ENABLED}
        language={language}
        labels={{
          strings,
          address: dict.common.address,
          errors: { ...dict.common.errors, ...strings.errors },
          markdown: markdownToolLabels(dict),
        }}
      />
    </>
  );
}
