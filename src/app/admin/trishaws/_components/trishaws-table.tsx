"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Accessibility } from "lucide-react";
import {
  DataTable,
  stopRowClick,
  type DataTableFilter,
  type DataTableStrings,
} from "@/components/ui/data-table";
import { FileThumb } from "@/features/fleet/components/file-image";
import {
  DAMAGE_RANK,
  TrishawDamageBadge,
  TrishawStatusBadge,
  type DamageState,
} from "@/features/fleet/components/trishaw-badges";
import type { TrishawStatusName } from "@/features/fleet/schemas";

export type TrishawListRow = {
  id: string;
  name: string;
  photoFileId: string | null;
  model: string | null;
  seats: string | null;
  wheelchair: boolean;
  location: string;
  isPool: boolean;
  status: TrishawStatusName;
  statusLabel: string;
  damage: DamageState;
  damageLabel: string;
  openDamages: number;
};

export type TrishawsTableLabels = {
  columns: {
    trishaw: string;
    model: string;
    location: string;
    status: string;
    damage: string;
    wheelchair: string;
  };
  noModel: string;
  pool: string;
  wheelchair: string;
};

export function TrishawsTable({
  rows,
  scopeQuery,
  filters,
  labels,
  table,
}: {
  rows: TrishawListRow[];
  scopeQuery: string;
  filters: DataTableFilter[];
  labels: TrishawsTableLabels;
  table: DataTableStrings;
}) {
  const href = (row: TrishawListRow) =>
    `/admin/trishaws/${row.id}${scopeQuery}`;

  const columns: ColumnDef<TrishawListRow, unknown>[] = [
    {
      id: "trishaw",
      accessorFn: (row) => row.name,
      enableHiding: false,
      meta: {
        label: labels.columns.trishaw,
        searchValue: (row) => `${row.name} ${row.model ?? ""} ${row.location}`,
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <FileThumb
            fileId={row.original.photoFileId}
            alt=""
            size="sm"
          />
          <Link
            href={href(row.original)}
            onClick={stopRowClick}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      id: "model",
      accessorFn: (row) => row.model ?? "",
      filterFn: "equalsString",
      meta: { label: labels.columns.model },
      cell: ({ row }) =>
        row.original.model ? (
          <div className="grid">
            <span>{row.original.model}</span>
            {row.original.seats ? (
              <span className="text-xs text-ink-soft">
                {row.original.seats}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-ink-faint">{labels.noModel}</span>
        ),
    },
    {
      id: "wheelchair",
      accessorFn: (row) => (row.wheelchair ? "yes" : "no"),
      filterFn: "equalsString",
      meta: { label: labels.columns.wheelchair },
      cell: ({ row }) =>
        row.original.wheelchair ? (
          <Accessibility
            role="img"
            aria-label={labels.wheelchair}
            className="size-4 text-ink"
          />
        ) : (
          <span
            aria-hidden
            className="text-ink-faint"
          >
            –
          </span>
        ),
    },
    {
      id: "location",
      accessorFn: (row) => row.location,
      filterFn: "equalsString",
      meta: { label: labels.columns.location },
      cell: ({ row }) => (
        <span className="inline-flex flex-wrap items-center gap-2 text-ink-soft">
          {row.original.location}
          {row.original.isPool ? (
            <span className="rounded-full bg-mint-tint px-2 text-xs text-ink">
              {labels.pool}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => row.status,
      filterFn: "equalsString",
      meta: { label: labels.columns.status },
      cell: ({ row }) => (
        <TrishawStatusBadge
          status={row.original.status}
          label={row.original.statusLabel}
        />
      ),
    },
    {
      id: "damage",
      accessorFn: (row) => row.damage,
      filterFn: "equalsString",
      enableSorting: true,
      sortingFn: (a, b) =>
        DAMAGE_RANK[a.original.damage] - DAMAGE_RANK[b.original.damage] ||
        b.original.openDamages - a.original.openDamages,
      meta: { label: labels.columns.damage },
      cell: ({ row }) => (
        <TrishawDamageBadge
          state={row.original.damage}
          label={row.original.damageLabel}
          count={row.original.openDamages}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      strings={table}
      filters={filters}
      rowHref={href}
      getRowId={(row) => row.id}
    />
  );
}
