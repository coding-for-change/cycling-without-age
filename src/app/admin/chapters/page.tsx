import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { chapters as chapterFeature } from "@/features/chapters";
import { CHAPTER_RADIUS_KM } from "@/features/chapters/schemas";
import { joinUrl } from "@/lib/app-url";
import { requireAdminScope } from "@/lib/auth-guards";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { ADMIN_LIFE, adminViewer } from "../admin-viewer";
import { canReach } from "../nav";
import { ChaptersActions } from "./_components/chapters-header";
import type { ChapterPin } from "./_components/chapters-map-view";
import {
  ChapterRowsSkeleton,
  ChaptersActionsSkeleton,
  ChaptersHeaderSkeleton,
} from "./_components/chapters-skeleton";
import { ChaptersTable, type ChapterRow } from "./_components/chapters-table";

type PageProps = { searchParams: Promise<AdminSearchParams> };

export default function ChaptersPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<ChaptersHeaderSkeleton />}>
        <ChaptersHeader />
      </Suspense>
      <Suspense fallback={<ChapterRowsSkeleton />}>
        <Chapters searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function ChaptersHeader() {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [{ scope }, viewer, dict] = await Promise.all([
    requireAdminScope(),
    adminViewer(),
    getDictionary(),
  ]);
  if (!canReach(scope, "chapters")) return null;
  const strings = dict.admin.chapters;

  return (
    <AdminPageHeader title={dict.admin.pages.chapters.title}>
      <Suspense fallback={<ChaptersActionsSkeleton />}>
        <ChaptersActions
          viewer={viewer}
          strings={{ ...strings.views, new: strings.new }}
        />
      </Suspense>
    </AdminPageHeader>
  );
}

async function Chapters({ searchParams }: PageProps) {
  const {
    scope,
    scopeQuery,
    chapters: inScope,
  } = await readActiveScope(searchParams, "chapters");

  const [dict, language, params, head, all, countries] = await Promise.all([
    getDictionary(),
    getLocale(),
    searchParams,
    headers(),
    chapterFeature.listChapters(),
    chapterFeature.listCountries(),
  ]);

  const notation = resolveLocale(head.get("accept-language"));
  const view = params.view === "map" ? "map" : "list";

  const detail = new Map(all.map((chapter) => [chapter.id, chapter]));
  const countryName = new Map(countries.map((c) => [c.id, c.name]));

  const rows: ChapterRow[] = inScope.flatMap((scoped) => {
    const chapter = detail.get(scoped.id);
    if (!chapter) return [];
    return [
      {
        id: chapter.id,
        name: chapter.name,
        slug: chapter.slug,
        city: chapter.city,
        countryId: chapter.countryId,
        countryName: countryName.get(chapter.countryId) ?? "",
        address: chapter.address,
        careHomeName: chapter.careHomeName,
        description: chapter.description,
        logo: chapter.logo,
        latitude: chapter.latitude,
        longitude: chapter.longitude,
        serviceRadiusKm: chapter.serviceRadiusKm,
      },
    ];
  });

  const pins: ChapterPin[] = all.map((chapter) => ({
    id: chapter.id,
    name: chapter.name,
    city: chapter.city,
    logo: chapter.logo,
    coords: { lat: chapter.latitude, lng: chapter.longitude },
    radiusKm: chapter.serviceRadiusKm ?? CHAPTER_RADIUS_KM.default,
  }));

  return (
    <ChaptersTable
      rows={rows}
      countries={scope.countries.map(({ id, name, code }) => ({
        id,
        name,
        code,
      }))}
      canCreateCountry={scope.canCreateCountries}
      pins={pins}
      view={view}
      language={language}
      notation={notation}
      joinBase={joinUrl("")}
      scopeQuery={scopeQuery}
      labels={{
        ...dict.admin.chapters,
        joinLink: dict.admin.settings.joinLink,
      }}
      table={dict.admin.table}
    />
  );
}
