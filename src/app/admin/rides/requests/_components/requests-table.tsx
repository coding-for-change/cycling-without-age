"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import type { RideRequestStatus } from "@/features/ride-requests/schemas";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { mutedColumn } from "../../../_components/table-columns";

export type RequestListRow = {
  id: string;
  href: string;
  date: string;
  time: string;
  startsIso: string;
  riders: string;
  model: string;
  where: string;
  asked: string;
  askedIso: string;
  requester: string;
  status: RideRequestStatus | "lapsed";
  chapterName: string;
};

type Strings = Dictionary["admin"]["rideRequests"];

const TONE: Record<RideRequestStatus | "lapsed", string> = {
  lapsed: "bg-canvas-deep text-ink-soft",
  pending: "bg-mint text-ink",
  scheduled: "bg-mint-tint text-ink",
  declined: "bg-canvas-deep text-ink-soft",
  withdrawn: "bg-canvas-deep text-ink-soft",
};

export function RequestsTable({
  rows,
  showChapter,
  strings,
  table,
  locale,
}: {
  rows: RequestListRow[];
  showChapter: boolean;
  strings: Strings;
  table: DataTableStrings;
  locale: Locale;
}) {
  const { columns: labels } = strings;

  const columns: ColumnDef<RequestListRow, unknown>[] = [
    {
      id: "when",
      accessorFn: (row) => row.startsIso,
      enableHiding: false,
      enableSorting: true,
      meta: {
        label: labels.when,
        searchValue: (row) =>
          `${row.date} ${row.riders} ${row.where} ${row.requester}`,
      },
      cell: ({ row }) => (
        <Link
          href={row.original.href}
          onClick={stopRowClick}
          className="grid hover:underline"
        >
          <span className="font-medium">{row.original.date}</span>
          <span className="text-xs text-ink-soft tabular-nums">
            {row.original.time}
          </span>
        </Link>
      ),
    },
    {
      id: "riders",
      accessorFn: (row) => row.riders,
      enableSorting: true,
      meta: { label: labels.riders },
      cell: ({ row }) => (
        <span className="grid">
          <span>{row.original.riders}</span>
          <span className="text-xs text-ink-soft">
            {row.original.requester}
          </span>
        </span>
      ),
    },
    mutedColumn<RequestListRow>("model", labels.model, (row) => row.model, {
      sortable: true,
    }),
    mutedColumn<RequestListRow>("where", labels.where, (row) => row.where),
    ...(showChapter
      ? [
          mutedColumn<RequestListRow>(
            "chapter",
            labels.chapter,
            (row) => row.chapterName,
            { sortable: true },
          ),
        ]
      : []),
    mutedColumn<RequestListRow>("asked", labels.asked, (row) => row.asked, {
      isoOf: (row) => row.askedIso,
    }),
    {
      id: "status",
      accessorFn: (row) => row.status,
      meta: { label: labels.status },
      cell: ({ row }) => (
        <Badge className={cn("font-normal", TONE[row.original.status])}>
          {strings.statuses[row.original.status]}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      strings={table}
      locale={locale}
      rowHref={(row) => row.href}
      getRowId={(row) => row.id}
    />
  );
}
