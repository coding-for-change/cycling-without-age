import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chapters } from "@/features/chapters";
import { requireSuperAdmin } from "@/lib/auth-guards";
import { getDictionary } from "@/lib/i18n";
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
  await requireSuperAdmin();

  const [dict, countries, params] = await Promise.all([
    getDictionary(),
    chapters.listCountries(),
    searchParams,
  ]);
  const admins = await Promise.all(
    countries.map((country) => chapters.listCountryAdmins(country.id)),
  );

  const rows: CountryRow[] = countries.map((country, index) => ({
    id: country.id,
    name: country.name,
    code: country.code,
    admins: admins[index].map((row) => ({
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
    })),
  }));

  const query = new URLSearchParams();
  for (const key of ["chapter", "country"] as const) {
    const value = params[key];
    if (typeof value === "string") query.set(key, value);
  }
  query.set("new", "1");

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.countries.title}>
        <Button
          asChild
          className="min-h-11 bg-red text-white hover:bg-red-hover"
        >
          <Link href={`/admin/countries?${query}`}>
            <Plus aria-hidden />
            {dict.admin.countries.new}
          </Link>
        </Button>
      </AdminPageHeader>
      <CountriesTable
        rows={rows}
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
