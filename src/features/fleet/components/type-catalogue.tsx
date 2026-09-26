"use client";

import Link from "next/link";
import { useId } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Accessibility } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { useDrawerParam } from "@/hooks/use-drawer-param";
import type { CatalogueScopeName } from "../schemas";
import { FileThumb } from "./file-image";

export type TypeCatalogueRow = {
  id: string;
  name: string;
  scope: CatalogueScopeName;
  scopeLabel: string;
  ownerName: string | null;
  seats: number;
  seatsLabel: string;
  wheelchair: boolean;
  trishaws: number;
  photoFileId: string | null;
  archived: boolean;
};

export type TypeCatalogueLabels = {
  columns: {
    name: string;
    scope: string;
    seats: string;
    wheelchair: string;
    trishaws: string;
  };
  wheelchairYes: string;
  wheelchairNo: string;
  archived: string;
  showArchived: string;
  scopes: Record<CatalogueScopeName, string>;
};

export function TypeCatalogue({
  rows,
  showArchived,
  scopeQuery,
  labels,
  table,
}: {
  rows: TypeCatalogueRow[];
  showArchived: boolean;
  scopeQuery: string;
  labels: TypeCatalogueLabels;
  table: DataTableStrings;
}) {
  const { go } = useDrawerParam();
  const toggleId = useId();
  const href = (row: TypeCatalogueRow) =>
    `/admin/trishaws/types/${row.id}${scopeQuery}`;

  const toggleArchived = (next: boolean) =>
    go((params) => {
      if (next) params.set("archived", "1");
      else params.delete("archived");
    });

  const columns: ColumnDef<TypeCatalogueRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      enableHiding: false,
      enableSorting: true,
      meta: {
        label: labels.columns.name,
        searchValue: (row) => `${row.name} ${row.ownerName ?? ""}`,
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <FileThumb
            fileId={row.original.photoFileId}
            alt=""
            size="sm"
          />
          <div className="grid min-w-0">
            <Link
              href={href(row.original)}
              onClick={stopRowClick}
              className="truncate font-medium hover:underline"
            >
              {row.original.name}
            </Link>
            {row.original.archived ? (
              <span className="text-xs text-ink-soft">{labels.archived}</span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      id: "scope",
      accessorFn: (row) => row.scope,
      filterFn: "equalsString",
      meta: { label: labels.columns.scope },
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              row.original.scope === "global"
                ? "bg-mint font-normal text-ink"
                : "bg-mint-tint font-normal text-ink"
            }
          >
            {row.original.scopeLabel}
          </Badge>
          {row.original.ownerName ? (
            <span className="text-2sm text-ink-soft">
              {row.original.ownerName}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "seats",
      accessorFn: (row) => row.seats,
      enableSorting: true,
      meta: { label: labels.columns.seats },
      cell: ({ row }) => (
        <span className="text-ink-soft tabular-nums">
          {row.original.seatsLabel}
        </span>
      ),
    },
    {
      id: "wheelchair",
      accessorFn: (row) =>
        row.wheelchair ? labels.wheelchairYes : labels.wheelchairNo,
      meta: { label: labels.columns.wheelchair },
      cell: ({ row }) =>
        row.original.wheelchair ? (
          <span className="inline-flex items-center gap-1.5 text-ink">
            <Accessibility
              aria-hidden
              className="size-4"
            />
            {labels.wheelchairYes}
          </span>
        ) : (
          <span className="text-ink-soft">{labels.wheelchairNo}</span>
        ),
    },
    {
      id: "trishaws",
      accessorFn: (row) => row.trishaws,
      enableSorting: true,
      meta: { label: labels.columns.trishaws },
      cell: ({ row }) => (
        <span className="text-ink-soft tabular-nums">
          {row.original.trishaws}
        </span>
      ),
    },
  ];

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-end gap-3">
        <label
          htmlFor={toggleId}
          className="text-2sm text-ink-soft"
        >
          {labels.showArchived}
        </label>
        <Switch
          id={toggleId}
          checked={showArchived}
          onCheckedChange={toggleArchived}
        />
      </div>
      <DataTable
        columns={columns}
        data={rows}
        strings={table}
        filters={[
          {
            columnId: "scope",
            label: labels.columns.scope,
            options: (["global", "country", "chapter"] as const).map(
              (scope) => ({ value: scope, label: labels.scopes[scope] }),
            ),
          },
        ]}
        rowHref={href}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
