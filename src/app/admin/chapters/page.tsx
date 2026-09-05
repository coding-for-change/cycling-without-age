import { Suspense } from "react";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chapters as chapterFeature } from "@/features/chapters";
import { getDictionary } from "@/lib/i18n";
import {
  AdminPageFallback,
  AdminPageHeader,
  AdminPageShell,
} from "../_components/admin-page";
import { readActiveScope } from "../active-scope";
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
  } = await readActiveScope(searchParams);
  if (!scope.canSeeChapters) forbidden();

  const [dict, all, countries] = await Promise.all([
    getDictionary(),
    chapterFeature.listChapters(),
    chapterFeature.listCountries(),
  ]);

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

  const query = new URLSearchParams();
  if (active.kind === "chapter") query.set("chapter", active.chapter.slug);
  if (active.kind === "country") query.set("country", active.country.code);
  query.set("new", "1");

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.chapters.title}>
        <Button
          asChild
          className="min-h-11 bg-red text-white hover:bg-red-hover"
        >
          <Link href={`/admin/chapters?${query}`}>
            <Plus aria-hidden />
            {dict.admin.chapters.new}
          </Link>
        </Button>
      </AdminPageHeader>
      <ChaptersTable
        rows={rows}
        countries={scope.countries.map(({ id, name }) => ({ id, name }))}
        labels={dict.admin.chapters}
        table={dict.admin.table}
      />
    </>
  );
}
