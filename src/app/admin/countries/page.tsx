import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chapters } from "@/features/chapters";
import { readActiveScope } from "../active-scope";
import { getDictionary, getLocale } from "@/lib/i18n";
import {
  AdminPageFallback,
  AdminPageHeader,
  AdminPageShell,
} from "../_components/admin-page";
import { CountriesTable, type CountryRow } from "./_components/countries-table";

type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function CountriesPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<AdminPageFallback />}>
        <Countries searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Countries({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  const [{ scopeQuery }, dict, language, countries] = await Promise.all([
    readActiveScope(searchParams, "countries"),
    getDictionary(),
    getLocale(),
    chapters.listCountries(),
  ]);
  const countryIds = countries.map((country) => country.id);
  const [admins, footprints] = await Promise.all([
    chapters.listAdminsByCountry(countryIds),
    chapters.listCountryFootprints(countryIds),
  ]);

  const rows: CountryRow[] = countries.map((country) => {
    const footprint = footprints.get(country.id);
    return {
      id: country.id,
      name: country.name,
      code: country.code,
      admins: admins.get(country.id) ?? [],
      footprint: {
        chapters: footprint?.chapters ?? 0,
        members: footprint?.members ?? 0,
        passengers: footprint?.passengers ?? 0,
      },
    };
  });

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.countries.title}>
        <Button
          asChild
          variant="brand"
          className="min-h-11"
        >
          <Link
            href={`/admin/countries${scopeQuery ? `${scopeQuery}&` : "?"}new=1`}
          >
            <Plus aria-hidden />
            {dict.admin.countries.new}
          </Link>
        </Button>
      </AdminPageHeader>
      <CountriesTable
        rows={rows}
        language={language}
        labels={{
          ...dict.admin.countries,
          appointDialog: {
            emailLabel: dict.admin.countries.appointLabel,
            hint: dict.admin.countries.appointBody,
            placeholder: dict.admin.countries.appointPlaceholder,
          },
        }}
        table={dict.admin.table}
      />
    </>
  );
}
