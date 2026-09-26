import { Suspense } from "react";
import { Bike } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { markdownToolLabels } from "@/components/markdown-editor";
import { fleet } from "@/features/fleet";
import { TypeCatalogue } from "@/features/fleet/components/type-catalogue";
import { TypeCreateDrawer } from "@/features/fleet/components/type-create-drawer";
import { formatPlural, wordsLocale } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../../_components/admin-page";
import { readActiveScope, type AdminSearchParams } from "../../active-scope";
import { AdminTabs } from "../../_components/admin-tabs";
import { fleetTabs } from "../_components/options";
import { TrishawsSkeleton } from "../_components/trishaws-skeleton";
import {
  catalogueCountryIds,
  ownerNameOf,
  ownerOptions,
  seatOptions,
} from "./_components/catalogue";

export default function TypesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<TrishawsSkeleton />}>
        <Types searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Types({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
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

  const common = dict.fleet.common;
  const strings = dict.fleet.types;
  const words = wordsLocale(language);
  const owners = ownerOptions(scope, active, chapters, dict);

  return (
    <>
      <AdminPageHeader title={dict.fleet.trishaws.tabs.models}>
        <TypeCreateDrawer
          owners={owners}
          scopeQuery={scopeQuery}
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
      </AdminPageHeader>

      <AdminTabs
        tabs={fleetTabs(dict.fleet.trishaws.tabs)}
        current="models"
        scopeQuery={scopeQuery}
        label={dict.fleet.trishaws.tabs.label}
      />

      <p className="-mt-2 text-sm text-ink-soft">{strings.body}</p>

      {rows.length > 0 || showArchived ? (
        <TypeCatalogue
          rows={rows.map((row) => ({
            id: row.id,
            name: row.name,
            scope: row.scope,
            scopeLabel: common.scopes[row.scope],
            ownerName: ownerNameOf(row),
            seats: row.seats,
            seatsLabel: formatPlural(row.seats, common.seats, words),
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
        />
      ) : (
        <EmptyState
          icon={Bike}
          className="flex-1 justify-start border-none pt-16"
        >
          {strings.empty}
        </EmptyState>
      )}
    </>
  );
}
