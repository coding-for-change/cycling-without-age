"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import { mutedColumn } from "../../_components/table-columns";
import { PersonAvatar } from "@/components/person-avatar";

export type PassengerRow = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatar: string;
  born: string;
  bornIso: string;
  chapterName: string;
  joined: string;
  joinedIso: string;
};

export function PassengersTable({
  rows,
  showChapter,
  scopeQuery,
  labels,
  phoneColumn,
  table,
}: {
  rows: PassengerRow[];
  showChapter: boolean;
  scopeQuery: string;
  labels: { name: string; born: string; joined: string; chapter: string };
  phoneColumn: string;
  table: DataTableStrings;
}) {
  const href = (row: PassengerRow) =>
    row.userId ? `/admin/members/${row.userId}${scopeQuery}` : undefined;

  const columns: ColumnDef<PassengerRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (row) => `${row.lastName} ${row.firstName}`,
      enableHiding: false,
      enableSorting: true,
      meta: {
        label: labels.name,
        searchValue: (row) =>
          `${row.firstName} ${row.lastName} ${row.email ?? ""} ${row.phone ?? ""}`,
      },
      cell: ({ row }) => {
        const link = href(row.original);
        const name = `${row.original.firstName} ${row.original.lastName}`;
        const contact = row.original.email ?? row.original.phone;
        return (
          <div className="flex items-center gap-3">
            <PersonAvatar svg={row.original.avatar} />
            <div className="grid">
              {link ? (
                <Link
                  href={link}
                  onClick={stopRowClick}
                  className="font-medium hover:underline"
                >
                  {name}
                </Link>
              ) : (
                <span className="font-medium">{name}</span>
              )}
              {contact ? (
                <span className="text-xs text-ink-soft">{contact}</span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    mutedColumn<PassengerRow>("born", labels.born, (row) => row.born, {
      isoOf: (row) => row.bornIso,
    }),
    mutedColumn<PassengerRow>("phone", phoneColumn, (row) => row.phone),
    ...(showChapter
      ? [
          mutedColumn<PassengerRow>(
            "chapter",
            labels.chapter,
            (row) => row.chapterName,
          ),
        ]
      : []),
    mutedColumn<PassengerRow>("joined", labels.joined, (row) => row.joined, {
      isoOf: (row) => row.joinedIso,
    }),
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      strings={table}
      initialHidden={["phone"]}
      rowHref={href}
      getRowId={(row) => row.id}
    />
  );
}
