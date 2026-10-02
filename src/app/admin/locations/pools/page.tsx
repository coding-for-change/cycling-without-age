import Link from "next/link";
import { Suspense } from "react";
import { forbidden } from "next/navigation";
import { Warehouse } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { markdownToolLabels } from "@/components/markdown-editor";
import { fleet } from "@/features/fleet";
import { wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { MAP_ENABLED } from "@/lib/mapbox-map";
import { AdminPageHeader, AdminPageShell } from "../../_components/admin-page";
import { AdminTabs } from "../../_components/admin-tabs";
import { hrefWith } from "../../_components/href-with";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { scopeCountries } from "../../scope-countries";
import { LocationCreateDrawer } from "../_components/location-create-drawer";
import {
  locationTabs,
  pendingRequests,
  waitingRequests,
} from "../pool-countries";
import { PoolsSkeleton } from "./_components/pools-skeleton";
import { PoolsTable } from "./_components/pools-table";

export default function PoolsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<PoolsSkeleton />}>
        <Pools searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Pools({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { scope, active, scopeQuery } = await readActiveScope(
    searchParams,
    "locations",
  );
  const countries = scopeCountries(scope, active);
  if (countries.length === 0) forbidden();

  const [pools, dict, language] = await Promise.all([
    fleet.listPools(countries.map((country) => country.id)),
    getDictionary(),
    getLocale(),
  ]);

  const strings = dict.fleet.locations;
  const common = dict.fleet.common;
  const words = wordsLocale(language);

  return (
    <>
      <AdminPageHeader title={strings.title}>
        <Button
          asChild
          variant="brand"
          className="min-h-11"
        >
          <Link
            href={hrefWith("/admin/locations/pools", scopeQuery, {
              new: "pool",
            })}
          >
            <Warehouse aria-hidden />
            {strings.actions.newPool}
          </Link>
        </Button>
      </AdminPageHeader>

      <AdminTabs
        tabs={locationTabs(strings.tabs, waitingRequests(pools))}
        current="pools"
        scopeQuery={scopeQuery}
        label={strings.tabs.label}
      />

      <p className="-mt-2 text-sm text-ink-soft">{strings.pools.body}</p>

      {pools.length > 0 ? (
        <PoolsTable
          rows={pools.map((pool) => {
            const waiting = pendingRequests(pool);
            return {
              id: pool.id,
              name: pool.name,
              countryName: pool.country?.name ?? "",
              address: pool.address ?? strings.noAddress,
              members: pool.chapters.filter(
                (link) => link.status === "approved",
              ).length,
              waiting,
              waitingLabel: formatMessage(
                strings.pools.waiting,
                { count: waiting },
                words,
              ),
              trishaws: pool._count.trishaws,
              code: pool.poolCode,
            };
          })}
          showCountry={countries.length > 1}
          scopeQuery={scopeQuery}
          labels={strings.pools.columns}
          table={dict.admin.table}
          locale={language}
        />
      ) : (
        <EmptyState
          icon={Warehouse}
          className="flex-1 justify-start border-none pt-16"
        >
          {strings.pools.empty}
        </EmptyState>
      )}

      <LocationCreateDrawer
        markdown={markdownToolLabels(dict)}
        chapters={[]}
        countries={countries.map((c) => ({ id: c.id, name: c.name }))}
        scopeQuery={scopeQuery}
        mapEnabled={MAP_ENABLED}
        language={language}
        strings={strings}
        common={common}
      />
    </>
  );
}
