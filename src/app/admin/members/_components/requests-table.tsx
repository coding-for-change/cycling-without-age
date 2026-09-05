"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import {
  DecisionDialog,
  type DecisionLabels,
  type DecisionTarget,
} from "./decision-dialog";
import { PersonAvatar } from "@/components/person-avatar";
import type { NotifyLabels } from "../../_components/action-feedback";

export type RequestRow = {
  applicationId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string;
  message: string | null;
  chapterName: string;
  applied: string;
  appliedIso: string;
};

export type RequestsLabels = DecisionLabels & {
  title: string;
  body: string;
  count: string;
  columns: { person: string; chapter: string; applied: string };
};

export function RequestsTable({
  rows,
  showChapter,
  scopeQuery,
  labels,
  phoneColumn,
  errors,
  count,
  table,
}: {
  rows: RequestRow[];
  showChapter: boolean;
  scopeQuery: string;
  labels: RequestsLabels;
  phoneColumn: string;
  errors: NotifyLabels["errors"];
  count: string;
  table: DataTableStrings;
}) {
  const [target, setTarget] = useState<DecisionTarget | null>(null);

  const columns: ColumnDef<RequestRow, unknown>[] = [
    {
      id: "person",
      accessorFn: (row) => row.name || row.email,
      enableHiding: false,
      meta: {
        label: labels.columns.person,
        searchValue: (row) => `${row.name} ${row.email} ${row.phone ?? ""}`,
      },
      cell: ({ row }) => (
        <div className="flex items-start gap-3">
          <PersonAvatar svg={row.original.avatar} />
          <div className="grid">
            <span className="font-medium">
              {row.original.name || row.original.email}
            </span>
            <span className="text-xs text-ink-soft">{row.original.email}</span>
            {row.original.message ? (
              <span className="mt-1 max-w-xs whitespace-normal text-ink-soft">
                {row.original.message}
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      accessorFn: (row) => row.phone ?? "",
      meta: { label: phoneColumn },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.phone}</span>
      ),
    },
    {
      id: "chapter",
      accessorFn: (row) => row.chapterName,
      meta: { label: labels.columns.chapter },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.chapterName}</span>
      ),
    },
    {
      id: "applied",
      accessorFn: (row) => row.applied,
      enableSorting: true,
      sortingFn: (a, b) =>
        a.original.appliedIso.localeCompare(b.original.appliedIso),
      meta: { label: labels.columns.applied },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.applied}</span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div
          className="flex justify-end gap-2"
          onClick={stopRowClick}
        >
          <Button
            className="min-h-11"
            onClick={() =>
              setTarget({
                applicationId: row.original.applicationId,
                name: row.original.name || row.original.email,
                approve: true,
              })
            }
          >
            {labels.approve}
          </Button>
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() =>
              setTarget({
                applicationId: row.original.applicationId,
                name: row.original.name || row.original.email,
                approve: false,
              })
            }
          >
            {labels.reject}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-medium">{labels.title}</h2>
        <Badge className="bg-mint font-normal text-ink">{count}</Badge>
      </div>
      <p className="max-w-2xl text-sm text-ink-soft">{labels.body}</p>

      <DataTable
        columns={columns}
        data={rows}
        strings={table}
        initialHidden={showChapter ? ["phone"] : ["chapter", "phone"]}
        rowHref={(row) => `/admin/members/${row.userId}${scopeQuery}`}
        getRowId={(row) => row.applicationId}
      />

      <DecisionDialog
        target={target}
        onClose={() => setTarget(null)}
        labels={labels}
        errors={errors}
      />
    </section>
  );
}
