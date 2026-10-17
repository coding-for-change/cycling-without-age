"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import type { FamilyStatusName } from "@/features/training/requirements";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import {
  PercentBar,
  TrainingStatusPill,
} from "../../../../_components/training-status";

type Stamp = { at: string; label: string; title: string } | null;

export type CourseProgressRowView = {
  id: string;
  userId: string;
  pilot: string;
  status: FamilyStatusName;
  percent: number;
  percentLabel: string;
  current: string | null;
  attempts: number;
  lastActivity: Stamp;
};

type Labels = Dictionary["admin"]["training"]["course"]["progress"];

const STATUSES: FamilyStatusName[] = [
  "passed",
  "exempt",
  "inProgress",
  "notStarted",
];

export function CourseProgressTable({
  rows,
  scopeQuery,
  labels,
  table,
  locale,
}: {
  rows: CourseProgressRowView[];
  scopeQuery: string;
  labels: Labels;
  table: DataTableStrings;
  locale: Locale;
}) {
  const href = (userId: string) => `/admin/members/${userId}${scopeQuery}`;

  const columns: ColumnDef<CourseProgressRowView, unknown>[] = [
    {
      id: "pilot",
      accessorFn: (row) => row.pilot,
      enableHiding: false,
      enableSorting: true,
      meta: { label: labels.columns.pilot },
      cell: ({ row }) => (
        <Link
          href={href(row.original.userId)}
          onClick={stopRowClick}
          className="truncate font-medium hover:underline"
        >
          {row.original.pilot}
        </Link>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => row.status,
      filterFn: "equalsString",
      meta: { label: labels.columns.status },
      cell: ({ row }) => (
        <TrainingStatusPill
          status={row.original.status}
          label={labels.statuses[row.original.status]}
        />
      ),
    },
    {
      id: "progress",
      accessorFn: (row) => row.percent,
      enableSorting: true,
      meta: { label: labels.columns.progress },
      cell: ({ row }) => (
        <span className="flex min-w-28 items-center gap-2">
          <PercentBar
            percent={row.original.percent}
            label={`${row.original.pilot}: ${row.original.percentLabel}`}
            className="w-16"
          />
          <span className="text-2sm text-ink-soft tabular-nums">
            {row.original.percentLabel}
          </span>
        </span>
      ),
    },
    {
      id: "current",
      accessorFn: (row) => row.current ?? "",
      meta: { label: labels.columns.current },
      cell: ({ row }) => (
        <span className="block max-w-56 truncate text-2sm text-ink-soft">
          {row.original.current}
        </span>
      ),
    },
    {
      id: "attempts",
      accessorFn: (row) => row.attempts,
      enableSorting: true,
      meta: { label: labels.columns.attempts },
      cell: ({ row }) => (
        <span className="text-2sm text-ink-soft tabular-nums">
          {row.original.attempts}
        </span>
      ),
    },
    {
      id: "lastActivity",
      accessorFn: (row) => row.lastActivity?.at ?? "",
      enableSorting: true,
      meta: { label: labels.columns.lastActivity },
      cell: ({ row }) =>
        row.original.lastActivity ? (
          <time
            dateTime={row.original.lastActivity.at}
            title={row.original.lastActivity.title}
            className="text-2sm whitespace-nowrap text-ink-soft tabular-nums"
          >
            {row.original.lastActivity.label}
          </time>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      strings={table}
      filters={[
        {
          columnId: "status",
          label: labels.columns.status,
          options: STATUSES.map((status) => ({
            value: status,
            label: labels.statuses[status],
          })),
        },
      ]}
      rowHref={(row) => href(row.userId)}
      getRowId={(row) => row.id}
      locale={locale}
    />
  );
}
