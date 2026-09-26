"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableStrings } from "@/components/ui/data-table";
import { mutedColumn } from "../../../_components/table-columns";

export type PoolTableRow = {
  id: string;
  name: string;
  countryName: string;
  address: string;
  members: number;
  waiting: number;
  waitingLabel: string;
  trishaws: number;
  code: string | null;
};

export type PoolTableLabels = {
  name: string;
  country: string;
  address: string;
  members: string;
  waiting: string;
  trishaws: string;
  code: string;
};

export function PoolsTable({
  rows,
  showCountry,
  scopeQuery,
  labels,
  table,
}: {
  rows: PoolTableRow[];
  showCountry: boolean;
  scopeQuery: string;
  labels: PoolTableLabels;
  table: DataTableStrings;
}) {
  const columns: ColumnDef<PoolTableRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      enableHiding: false,
      enableSorting: true,
      meta: { label: labels.name },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: "waiting",
      accessorFn: (row) => row.waiting,
      enableSorting: true,
      meta: { label: labels.waiting },
      cell: ({ row }) =>
        row.original.waiting > 0 ? (
          <Badge className="bg-mint-deep font-medium text-white tabular-nums">
            {row.original.waitingLabel}
          </Badge>
        ) : (
          <span className="text-ink-faint">–</span>
        ),
    },
    ...(showCountry
      ? [
          mutedColumn<PoolTableRow>(
            "country",
            labels.country,
            (row) => row.countryName,
            { sortable: true },
          ),
        ]
      : []),
    mutedColumn<PoolTableRow>("address", labels.address, (row) => row.address),
    mutedColumn<PoolTableRow>("members", labels.members, (row) => row.members, {
      sortable: true,
    }),
    mutedColumn<PoolTableRow>(
      "trishaws",
      labels.trishaws,
      (row) => row.trishaws,
      { sortable: true },
    ),
    {
      id: "code",
      accessorFn: (row) => row.code ?? "",
      meta: { label: labels.code },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-ink-soft">
          {row.original.code ?? "–"}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      strings={table}
      getRowId={(row) => row.id}
      rowHref={(row) => `/admin/locations/${row.id}${scopeQuery}`}
    />
  );
}
