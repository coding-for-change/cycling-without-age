"use client";

import { useRouter } from "next/navigation";
import { startTransition, useOptimistic } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type DataTableStrings } from "@/components/ui/data-table";
import { AdminEmpty } from "../../_components/admin-empty";
import { ICONS } from "../../_components/icons";
import { mutedColumn } from "../../_components/table-columns";
import { useDrawerParam } from "../../_components/use-drawer-param";
import type { Locale } from "@/lib/format";
import {
  ChapterCreateDrawer,
  type ChapterCreateStrings,
} from "./chapter-create-drawer";
import { ChaptersMapView, type ChapterPin } from "./chapters-map-view";

export type ChapterRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  countryId: string;
  countryName: string;
  address: string | null;
  careHomeName: string | null;
  description: string | null;
  logo: string | null;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
};

export type ChapterListStrings = ChapterCreateStrings & {
  empty: string;
  open: string;
  fields: ChapterCreateStrings["fields"] & {
    slug: string;
    serviceRadiusKm: string;
  };
};

export function ChaptersTable({
  rows,
  countries,
  canCreateCountry,
  pins,
  view,
  language,
  notation,
  joinBase,
  scopeQuery,
  labels,
  table,
}: {
  rows: ChapterRow[];
  countries: { id: string; name: string; code: string }[];
  canCreateCountry: boolean;
  pins: ChapterPin[];
  view: "list" | "map";
  language: string;
  notation: Locale;
  joinBase: string;
  scopeQuery: string;
  labels: ChapterListStrings;
  table: DataTableStrings;
}) {
  const router = useRouter();
  const { creating, close } = useDrawerParam();
  const [optimisticRows, addOptimisticRow] = useOptimistic(
    rows,
    (state: ChapterRow[], row: ChapterRow) =>
      [...state, row].sort((a, b) => a.name.localeCompare(b.name)),
  );

  const created = (row: ChapterRow) => {
    startTransition(() => {
      addOptimisticRow(row);
      router.refresh();
    });
  };

  const columns: ColumnDef<ChapterRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      enableHiding: false,
      enableSorting: true,
      meta: { label: labels.fields.name },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: "slug",
      accessorFn: (row) => row.slug,
      meta: { label: labels.fields.slug },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-ink-soft">
          {row.original.slug}
        </span>
      ),
    },
    mutedColumn<ChapterRow>("city", labels.fields.city, (row) => row.city),
    mutedColumn<ChapterRow>(
      "country",
      labels.fields.country,
      (row) => row.countryName,
      { filterFn: "equalsString" },
    ),
    mutedColumn<ChapterRow>(
      "serviceRadiusKm",
      labels.fields.serviceRadiusKm,
      (row) => row.serviceRadiusKm,
      { sortable: true },
    ),
  ];

  return (
    <>
      {view === "map" ? (
        <ChaptersMapView
          pins={pins}
          notation={notation}
          scopeQuery={scopeQuery}
          strings={{
            empty: labels.empty,
            mapLabel: labels.mapLabel,
            mapUnavailable: labels.mapUnavailable,
            open: labels.open,
            close: labels.cancel,
            radiusValue: labels.create.radiusValue,
          }}
        />
      ) : optimisticRows.length === 0 ? (
        <AdminEmpty icon={ICONS.chapters}>{labels.empty}</AdminEmpty>
      ) : (
        <DataTable
          columns={columns}
          data={optimisticRows}
          strings={table}
          filters={
            countries.length > 1
              ? [
                  {
                    columnId: "country",
                    label: labels.fields.country,
                    options: countries.map((country) => ({
                      value: country.name,
                      label: country.name,
                    })),
                  },
                ]
              : []
          }
          getRowId={(row) => row.id}
          rowHref={(row) => `/admin/chapters/${row.id}${scopeQuery}`}
        />
      )}

      <ChapterCreateDrawer
        key="new"
        open={creating}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        onCreated={created}
        countries={countries}
        canCreateCountry={canCreateCountry}
        pins={pins}
        language={language}
        notation={notation}
        joinBase={joinBase}
        scopeQuery={scopeQuery}
        strings={labels}
      />
    </>
  );
}
