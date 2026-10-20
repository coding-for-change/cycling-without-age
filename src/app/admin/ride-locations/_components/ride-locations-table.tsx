"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  stopRowClick,
  type DataTableFilter,
  type DataTableStrings,
} from "@/components/ui/data-table";
import type { RideLocationKind } from "@/features/ride-locations/schemas";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

export type RideLocationListRow = {
  id: string;
  name: string;
  kind: RideLocationKind;
  address: string | null;
  contact: string | null;
  chapterName: string;
  upcoming: number;
  upcomingLabel: string;
  archived: boolean;
};

type Strings = Dictionary["admin"]["rideLocations"];

export function RideLocationsTable({
  rows,
  scopeQuery,
  showChapter,
  strings,
  table,
  locale,
}: {
  rows: RideLocationListRow[];
  scopeQuery: string;
  showChapter: boolean;
  strings: Strings;
  table: DataTableStrings;
  locale: Locale;
}) {
  const href = (row: RideLocationListRow) =>
    `/admin/ride-locations/${row.id}${scopeQuery}`;
  const { columns: labels } = strings;

  const columns: ColumnDef<RideLocationListRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      enableHiding: false,
      meta: {
        label: labels.name,
        searchValue: (row) =>
          `${row.name} ${row.address ?? ""} ${row.contact ?? ""}`,
      },
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <Link
            href={href(row.original)}
            onClick={stopRowClick}
            className={cn(
              "font-medium hover:underline",
              row.original.archived && "text-ink-soft",
            )}
          >
            {row.original.name}
          </Link>
          {row.original.archived ? (
            <Badge className="bg-canvas-deep font-normal text-ink-soft">
              {strings.statuses.archived}
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      id: "kind",
      accessorFn: (row) => row.kind,
      filterFn: "equalsString",
      meta: { label: labels.kind },
      cell: ({ row }) => (
        <Badge className="bg-mint-tint font-normal text-ink">
          {strings.kinds[row.original.kind]}
        </Badge>
      ),
    },
    {
      id: "address",
      accessorFn: (row) => row.address ?? "",
      meta: { label: labels.address },
      cell: ({ row }) =>
        row.original.address ? (
          <span
            title={row.original.address}
            className="block max-w-64 truncate text-ink-soft"
          >
            {row.original.address}
          </span>
        ) : (
          <span className="text-ink-faint">{strings.noAddress}</span>
        ),
    },
    {
      id: "contact",
      accessorFn: (row) => row.contact ?? "",
      meta: { label: labels.contact },
      cell: ({ row }) =>
        row.original.contact ? (
          <span
            title={row.original.contact}
            className="block max-w-48 truncate text-ink-soft"
          >
            {row.original.contact}
          </span>
        ) : (
          <span className="text-ink-faint">{strings.noContact}</span>
        ),
    },
    ...(showChapter
      ? [
          {
            id: "chapter",
            accessorFn: (row: RideLocationListRow) => row.chapterName,
            filterFn: "equalsString" as const,
            meta: { label: labels.chapter },
            cell: ({ row }: { row: { original: RideLocationListRow } }) => (
              <span
                title={row.original.chapterName}
                className="block max-w-48 truncate"
              >
                {row.original.chapterName}
              </span>
            ),
          },
        ]
      : []),
    {
      id: "upcoming",
      accessorFn: (row) => row.upcoming,
      meta: { label: labels.upcoming },
      cell: ({ row }) => (
        <span
          className={cn(
            "tabular-nums",
            row.original.upcoming ? "text-ink" : "text-ink-faint",
          )}
        >
          {row.original.upcomingLabel}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => (row.archived ? "archived" : "active"),
      filterFn: "equalsString",
      meta: { label: labels.status },
      cell: ({ row }) =>
        row.original.archived ? (
          <Badge className="bg-canvas-deep font-normal text-ink-soft">
            {strings.statuses.archived}
          </Badge>
        ) : (
          <span className="text-ink-soft">{strings.statuses.active}</span>
        ),
    },
  ];

  const kinds = [...new Set(rows.map((row) => row.kind))];
  const chapters = [...new Set(rows.map((row) => row.chapterName))];
  const filters: DataTableFilter[] = [
    ...(kinds.length > 1
      ? [
          {
            columnId: "kind",
            label: labels.kind,
            options: kinds.map((kind) => ({
              value: kind,
              label: strings.kinds[kind],
            })),
          },
        ]
      : []),
    ...(showChapter && chapters.length > 1
      ? [
          {
            columnId: "chapter",
            label: labels.chapter,
            options: chapters.map((name) => ({ value: name, label: name })),
          },
        ]
      : []),
    ...(rows.some((row) => row.archived)
      ? [
          {
            columnId: "status",
            label: labels.status,
            options: (["active", "archived"] as const).map((status) => ({
              value: status,
              label: strings.statuses[status],
            })),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      strings={table}
      locale={locale}
      filters={filters}
      rowHref={href}
      getRowId={(row) => row.id}
      initialHidden={showChapter ? ["contact", "status"] : ["status"]}
    />
  );
}
