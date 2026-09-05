"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import { PersonAvatar } from "@/components/person-avatar";

export type MemberRow = {
  userId: string;
  chapterId: string;
  chapterName: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string;
  roles: string[];
  isAdmin: boolean;
  since: string;
  sinceIso: string;
};

export type MembersTableLabels = {
  columns: { person: string; role: string; phone: string; joined: string };
};

export function MembersTable({
  rows,
  showChapter,
  scopeQuery,
  labels,
  chapterColumn,
  table,
}: {
  rows: MemberRow[];
  showChapter: boolean;
  scopeQuery: string;
  labels: MembersTableLabels;
  chapterColumn: string;
  table: DataTableStrings;
}) {
  const href = (row: MemberRow) => `/admin/members/${row.userId}${scopeQuery}`;

  const columns: ColumnDef<MemberRow, unknown>[] = [
    {
      id: "person",
      accessorFn: (row) => row.name || row.email,
      enableHiding: false,
      meta: {
        label: labels.columns.person,
        searchValue: (row) => `${row.name} ${row.email} ${row.phone ?? ""}`,
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <PersonAvatar svg={row.original.avatar} />
          <div className="grid">
            <Link
              href={href(row.original)}
              onClick={stopRowClick}
              className="font-medium hover:underline"
            >
              {row.original.name || row.original.email}
            </Link>
            <span className="text-xs text-ink-soft">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      id: "roles",
      accessorFn: (row) => row.roles,
      filterFn: "arrIncludes",
      meta: { label: labels.columns.role },
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {row.original.roles.map((role) => (
            <Badge
              key={role}
              className="bg-mint-tint font-normal text-ink"
            >
              {role}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "phone",
      accessorFn: (row) => row.phone ?? "",
      meta: { label: labels.columns.phone },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.phone}</span>
      ),
    },
    {
      id: "chapter",
      accessorFn: (row) => row.chapterName,
      meta: { label: chapterColumn },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.chapterName}</span>
      ),
    },
    {
      id: "joined",
      accessorFn: (row) => row.since,
      enableSorting: true,
      sortingFn: (a, b) =>
        a.original.sinceIso.localeCompare(b.original.sinceIso),
      meta: { label: labels.columns.joined },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.since}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      strings={table}
      initialHidden={showChapter ? ["phone"] : ["chapter", "phone"]}
      rowHref={href}
      getRowId={(row) => `${row.chapterId}:${row.userId}`}
    />
  );
}
