import { Suspense, cache } from "react";
import { Bike } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { markdownToolLabels } from "@/components/markdown-editor";
import { fleet } from "@/features/fleet";
import { TypeCatalogue } from "@/features/fleet/components/type-catalogue";
import { TypeCreateDrawer } from "@/features/fleet/components/type-create-drawer";
import { wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { formatMessage } from "@/lib/i18n/format";
import { AdminPageShell } from "../../_components/admin-page";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { FleetHeader } from "../_components/fleet-header";
import {
  FleetActionSkeleton,
  FleetHeaderSkeleton,
  TrishawRowsSkeleton,
} from "../_components/trishaws-skeleton";
import {
  catalogueCountryIds,
  ownerNameOf,
  ownerOptions,
  seatOptions,
} from "./_components/catalogue";
import { fleetCommon } from "@/features/fleet/components/strings";

type PageProps = { searchParams: Promise<AdminSearchParams> };

export default function TypesPage({ searchParams }: PageProps) {
  return (
    <AdminPageShell>
      <Suspense fallback={<FleetHeaderSkeleton intro />}>
        <FleetHeader
          current="models"
          action={
            <Suspense fallback={<FleetActionSkeleton />}>
              <CreateType searchParams={searchParams} />
            </Suspense>
          }
        />
      </Suspense>
      <Suspense fallback={<TrishawRowsSkeleton />}>
        <Types searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

const loadTypes = cache(async (searchParams: Promise<AdminSearchParams>) => {
  const { scope, active, scopeQuery, chapters, chapterIds } =
    await readActiveScope(searchParams, "bikes");
  const params = await searchParams;
  const showArchived = params.archived === "1";

  const [rows, dict, language] = await Promise.all([
    fleet.listTypes({
      countryIds: catalogueCountryIds(scope, active, chapters),
      chapterIds,
      includeArchived: showArchived,
    }),
    getDictionary(),
    getLocale(),
  ]);

  return {
    scope,
    active,
    scopeQuery,
    chapters,
    showArchived,
    rows,
    dict,
    language,
  };
});

async function CreateType({ searchParams }: PageProps) {
  const { scope, active, scopeQuery, chapters, dict, language } =
    await loadTypes(searchParams);
  const common = fleetCommon(dict);
  const strings = dict.fleet.types;
  const owners = ownerOptions(
    scope,
    active,
    chapters,
    dict,
    wordsLocale(language),
  );

  return (
    <TypeCreateDrawer
      owners={owners}
      scopeQuery={scopeQuery}
      locale={language}
      labels={{
        ...strings.create,
        open: strings.new,
        seatOptions: seatOptions(dict, language),
        markdownHint: common.markdownHint,
        gallery: { ...common.gallery, errors: common.errors },
        markdown: markdownToolLabels(dict),
        photoHint: strings.detail.photoHint,
        manualHint: strings.detail.manualHint,
        manualLabels: common.manual,
        errors: common.errors,
      }}
    />
  );
}

async function Types({ searchParams }: PageProps) {
  const { scopeQuery, showArchived, rows, dict, language } =
    await loadTypes(searchParams);
  const common = fleetCommon(dict);
  const strings = dict.fleet.types;
  const words = wordsLocale(language);

  return rows.length > 0 || showArchived ? (
    <TypeCatalogue
      rows={rows.map((row) => ({
        id: row.id,
        name: row.name,
        scope: row.scope,
        scopeLabel: common.scopes[row.scope],
        ownerName: ownerNameOf(row),
        seats: row.seats,
        seatsLabel: formatMessage(common.seats, { count: row.seats }, words),
        wheelchair: row.wheelchairAccessible,
        trishaws: row._count.trishaws,
        photoFileId: row.photoFileId,
        archived: row.archivedAt !== null,
      }))}
      showArchived={showArchived}
      scopeQuery={scopeQuery}
      labels={{
        columns: strings.columns,
        wheelchairYes: strings.wheelchairYes,
        wheelchairNo: strings.wheelchairNo,
        archived: strings.archived,
        showArchived: strings.showArchived,
        scopes: common.scopes,
      }}
      table={dict.admin.table}
      locale={language}
    />
  ) : (
    <EmptyState
      icon={Bike}
      className="flex-1 justify-start border-none pt-16"
    >
      {strings.empty}
    </EmptyState>
  );
}
