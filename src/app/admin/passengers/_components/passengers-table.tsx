"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
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
    {
      id: "born",
      accessorFn: (row) => row.born,
      enableSorting: true,
      sortingFn: (a, b) => a.original.bornIso.localeCompare(b.original.bornIso),
      meta: { label: labels.born },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.born}</span>
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
    ...(showChapter
      ? [
          {
            id: "chapter",
            accessorFn: (row: PassengerRow) => row.chapterName,
            meta: { label: labels.chapter },
            cell: ({ row }) => (
              <span className="text-ink-soft">{row.original.chapterName}</span>
            ),
          } satisfies ColumnDef<PassengerRow, unknown>,
        ]
      : []),
    {
      id: "joined",
      accessorFn: (row) => row.joined,
      enableSorting: true,
      sortingFn: (a, b) =>
        a.original.joinedIso.localeCompare(b.original.joinedIso),
      meta: { label: labels.joined },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.joined}</span>
      ),
    },
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
