import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { List, Map as MapIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chapters as chapterFeature } from "@/features/chapters";
import { CHAPTER_RADIUS_KM } from "@/features/chapters/schemas";
import { joinUrl } from "@/lib/app-url";
import { resolveLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  AdminPageFallback,
  AdminPageHeader,
  AdminPageShell,
} from "../_components/admin-page";
import { readActiveScope } from "../active-scope";
import type { ChapterPin } from "./_components/chapters-map-view";
import { ChaptersTable, type ChapterRow } from "./_components/chapters-table";

type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ChaptersPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <Chapters searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Chapters({ searchParams }: { searchParams: AdminSearchParams }) {
  const {
    scope,
    active,
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

  // Every chapter, not just the ones in scope: an overlap warning is only
  // useful if it can see the neighbour on the other side of the border.
  const pins: ChapterPin[] = all.map((chapter) => ({
    id: chapter.id,
    name: chapter.name,
    city: chapter.city,
    logo: chapter.logo,
    coords: { lat: chapter.latitude, lng: chapter.longitude },
    radiusKm: chapter.serviceRadiusKm ?? CHAPTER_RADIUS_KM.default,
  }));

  const scopeParams = new URLSearchParams();
  if (active.kind === "chapter")
    scopeParams.set("chapter", active.chapter.slug);
  if (active.kind === "country")
    scopeParams.set("country", active.country.code);

  const href = (extra: Record<string, string>) => {
    const query = new URLSearchParams(scopeParams);
    for (const [key, value] of Object.entries(extra)) query.set(key, value);
    const search = query.toString();
    return search ? `/admin/chapters?${search}` : "/admin/chapters";
  };

  const scopeQuery = scopeParams.toString() ? `?${scopeParams}` : "";
  const keepView: Record<string, string> =
    view === "map" ? { view: "map" } : {};

  const tab = "flex min-h-9 items-center gap-1.5 rounded-full px-3 text-2sm";
  const activeTab = "bg-canvas text-ink shadow-soft";

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.chapters.title}>
        <div className="flex items-center gap-1 rounded-full bg-grey-tint p-1">
          <Link
            href={href({})}
            aria-current={view === "list" ? "page" : undefined}
            className={cn(tab, view === "list" ? activeTab : "text-ink-soft")}
          >
            <List
              className="size-4"
              aria-hidden
            />
            {dict.admin.chapters.views.list}
          </Link>
          <Link
            href={href({ view: "map" })}
            aria-current={view === "map" ? "page" : undefined}
            className={cn(tab, view === "map" ? activeTab : "text-ink-soft")}
          >
            <MapIcon
              className="size-4"
              aria-hidden
            />
            {dict.admin.chapters.views.map}
          </Link>
        </div>
        <Button
          asChild
          variant="brand"
          className="min-h-11"
        >
          <Link href={href({ ...keepView, new: "1" })}>
            <Plus aria-hidden />
            {dict.admin.chapters.new}
          </Link>
        </Button>
      </AdminPageHeader>
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
    </>
  );
}
