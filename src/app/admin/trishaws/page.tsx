import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { ICONS } from "@/components/icons";
import { fleet } from "@/features/fleet";
import {
  DAMAGE_RANK,
  damageStateOf,
} from "@/features/fleet/components/trishaw-badges";
import { TrishawCreateDrawer } from "@/features/fleet/components/trishaw-create-drawer";
import { collator, wordsLocale } from "@/lib/format";
import { trishawSummary } from "@/components/trishaw-summary";
import { getDictionary, getLocale } from "@/lib/i18n";
import { AdminPageHeader, AdminPageShell } from "../_components/admin-page";
import { AdminTabs } from "../_components/admin-tabs";
import { readActiveScope, type AdminSearchParams } from "../active-scope";
import {
  fleetTabs,
  locationOption,
  manageableLocations,
  typeOptions,
} from "./_components/options";
import {
  TrishawsTable,
  type TrishawListRow,
} from "./_components/trishaws-table";
import { TrishawsSkeleton } from "./_components/trishaws-skeleton";

export default function TrishawsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  return (
    <AdminPageShell>
      <Suspense fallback={<TrishawsSkeleton />}>
        <Trishaws searchParams={searchParams} />
      </Suspense>
    </AdminPageShell>
  );
}

async function Trishaws({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const { session, active, scopeQuery, chapters, chapterIds } =
    await readActiveScope(searchParams, "bikes");
  const countryIds = [...new Set(chapters.map((chapter) => chapter.countryId))];

  const [list, locations, types, dict, language] = await Promise.all([
    fleet.listTrishaws(chapterIds),
    fleet.listLocationsForChapters(chapterIds),
    fleet.listTypes({ countryIds, chapterIds }),
    getDictionary(),
    getLocale(),
  ]);
  const manageable = await manageableLocations(session.access, locations);

  const common = dict.fleet.common;
  const strings = dict.fleet.trishaws;
  const words = wordsLocale(language);
  const byName = collator(language);

  const rows: TrishawListRow[] = list
    .map((trishaw) => {
      const damage = damageStateOf(trishaw.damages);
      return {
        ...trishawSummary(trishaw, dict, words),
        status: trishaw.status,
        statusLabel: common.statuses[trishaw.status],
        damage,
        damageLabel:
          damage === "grounded"
            ? common.grounded
            : damage === "damaged"
              ? common.damaged
              : "",
        openDamages: trishaw.damages.length,
      };
    })
    .sort(
      (a, b) =>
        DAMAGE_RANK[a.damage] - DAMAGE_RANK[b.damage] ||
        byName.compare(a.name, b.name),
    );

  const unique = (values: string[]) =>
    [...new Set(values)].sort(byName.compare);
  const models = unique(rows.flatMap((row) => (row.model ? [row.model] : [])));
  const places = unique(rows.map((row) => row.location));

  const defaultLocation =
    (active.kind === "chapter"
      ? manageable.find(
          (location) =>
            location.isDefault && location.ownerChapterId === active.chapter.id,
        )
      : manageable.find((location) => location.isDefault)) ?? manageable[0];

  return (
    <>
      <AdminPageHeader title={dict.admin.pages.bikes.title}>
        {manageable.length > 0 ? (
          <TrishawCreateDrawer
            types={typeOptions(types, dict, language)}
            locations={manageable.map(locationOption)}
            defaultLocationId={defaultLocation.id}
            scopeQuery={scopeQuery}
            locale={language}
            labels={{
              ...strings.create,
              open: strings.new,
              typePicker: {
                placeholder: strings.picker.modelPlaceholder,
                empty: strings.picker.modelEmpty,
                wheelchair: common.wheelchair,
              },
              locationPicker: {
                placeholder: strings.picker.locationPlaceholder,
                empty: strings.picker.locationEmpty,
                pool: common.pool,
              },
              gallery: { ...common.gallery, errors: common.errors },
              photoHint: strings.detail.photoHint,
              errors: common.errors,
            }}
          />
        ) : null}
      </AdminPageHeader>

      <AdminTabs
        tabs={fleetTabs(strings.tabs)}
        current="trishaws"
        scopeQuery={scopeQuery}
        label={strings.tabs.label}
      />

      {rows.length > 0 ? (
        <TrishawsTable
          rows={rows}
          scopeQuery={scopeQuery}
          table={dict.admin.table}
          locale={language}
          labels={{
            columns: strings.columns,
            noModel: strings.noModel,
            pool: common.pool,
            wheelchair: common.wheelchair,
          }}
          filters={[
            ...(models.length > 1
              ? [
                  {
                    columnId: "model",
                    label: strings.columns.model,
                    options: models.map((model) => ({
                      value: model,
                      label: model,
                    })),
                  },
                ]
              : []),
            {
              columnId: "wheelchair",
              label: strings.columns.wheelchair,
              options: [
                { value: "yes", label: strings.wheelchairFilter.yes },
                { value: "no", label: strings.wheelchairFilter.no },
              ],
            },
            ...(places.length > 1
              ? [
                  {
                    columnId: "location",
                    label: strings.columns.location,
                    options: places.map((place) => ({
                      value: place,
                      label: place,
                    })),
                  },
                ]
              : []),
            {
              columnId: "status",
              label: strings.columns.status,
              options: (["active", "maintenance", "retired"] as const).map(
                (status) => ({ value: status, label: common.statuses[status] }),
              ),
            },
            {
              columnId: "damage",
              label: strings.columns.damage,
              options: (["grounded", "damaged", "none"] as const).map(
                (state) => ({
                  value: state,
                  label: strings.damageFilter[state],
                }),
              ),
            },
          ]}
        />
      ) : (
        <EmptyState icon={ICONS.bikes}>
          {manageable.length > 0 ? strings.empty : strings.noLocations}
        </EmptyState>
      )}
    </>
  );
}
