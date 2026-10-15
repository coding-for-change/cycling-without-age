import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { Skeleton } from "@/components/ui/skeleton";
import { chapters } from "@/features/chapters";
import { fleet } from "@/features/fleet";
import { rideLocations } from "@/features/ride-locations";
import { requireAdminScope } from "@/lib/auth-guards";
import { getDictionary, getLocale } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { PageHeaderSkeleton } from "../_components/admin-skeletons";
import { deletionConsequences } from "../_components/deletion-consequences";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import { ADMIN_LIFE, adminViewer } from "../admin-viewer";
import { canReach } from "../nav";
import { CountriesTable, type CountryRow } from "./_components/countries-table";
import { CountriesActions } from "./_components/countries-header";
import {
  CountryRowsSkeleton,
  NEW_COUNTRY,
} from "./_components/countries-skeleton";

type PageProps = { searchParams: Promise<AdminSearchParams> };

export default function CountriesPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PageHeaderSkeleton actions={[NEW_COUNTRY]} />}>
        <CountriesHeader />
      </Suspense>
      <Suspense fallback={<CountryRowsSkeleton />}>
        <Countries searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function CountriesHeader() {
  "use cache: private";
  cacheLife(ADMIN_LIFE);

  const [{ scope }, viewer, dict] = await Promise.all([
    requireAdminScope(),
    adminViewer(),
    getDictionary(),
  ]);
  if (!canReach(scope, "countries")) return null;

  return (
    <AdminPageHeader title={dict.admin.pages.countries.title}>
      <Suspense fallback={<Skeleton className={NEW_COUNTRY} />}>
        <CountriesActions
          viewer={viewer}
          label={dict.admin.countries.new}
        />
      </Suspense>
    </AdminPageHeader>
  );
}

async function Countries({ searchParams }: PageProps) {
  const [, dict, language, countries] = await Promise.all([
    readActiveScope(searchParams, "countries"),
    getDictionary(),
    getLocale(),
    chapters.listCountries(),
  ]);
  const countryIds = countries.map((country) => country.id);
  const [admins, footprints, fleetFootprints, rideLocationCounts] =
    await Promise.all([
      chapters.listAdminsByCountry(countryIds),
      chapters.listCountryFootprints(countryIds),
      fleet.listCountryFleetFootprints(countryIds),
      rideLocations.countCountryRideLocations(countryIds),
    ]);

  const rows: CountryRow[] = countries.map((country) => {
    const footprint = footprints.get(country.id);
    return {
      id: country.id,
      name: country.name,
      code: country.code,
      admins: admins.get(country.id) ?? [],
      consequences: deletionConsequences(
        {
          chapters: footprint?.chapters,
          members: footprint?.members,
          passengers: footprint?.passengers,
          rides: footprint?.rides,
          rideLocations: rideLocationCounts.get(country.id),
          ...fleetFootprints.get(country.id),
        },
        dict.admin.deletion,
        language,
      ),
    };
  });

  return (
    <CountriesTable
      rows={rows}
      language={language}
      labels={{
        ...dict.admin.countries,
        delete: {
          ...dict.admin.countries.delete,
          consequences: dict.admin.deletion.consequences,
        },
        appointDialog: {
          emailLabel: dict.admin.countries.appointLabel,
          hint: dict.admin.countries.appointBody,
          placeholder: dict.admin.countries.appointPlaceholder,
        },
      }}
      table={dict.admin.table}
    />
  );
}
