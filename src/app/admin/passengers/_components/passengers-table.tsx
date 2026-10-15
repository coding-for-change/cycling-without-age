"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import { mutedColumn } from "../../_components/table-columns";
import type { Locale } from "@/lib/i18n/locales";
import { PersonAvatar } from "@/components/person-avatar";
import { adminPersonHref } from "@/lib/profile-routes";
import { formatMessage } from "@/lib/i18n/format";

export type PassengerRow = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  caretaker: { id: string; name: string; contact: string | null } | null;
  pickup: string | null;
  avatar: string;
  photoUrl: string | null;
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
  locale,
}: {
  rows: PassengerRow[];
  showChapter: boolean;
  scopeQuery: string;
  labels: {
    name: string;
    born: string;
    joined: string;
    chapter: string;
    caretaker: string;
    pickup: string;
    via: string;
  };
  phoneColumn: string;
  table: DataTableStrings;
  locale: Locale;
}) {
  const href = (row: PassengerRow) =>
    `${adminPersonHref(
      row.userId
        ? { kind: "user", id: row.userId }
        : { kind: "passenger", id: row.id },
    )}${scopeQuery}`;

  const columns: ColumnDef<PassengerRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (row) => `${row.lastName} ${row.firstName}`,
      enableHiding: false,
      enableSorting: true,
      meta: {
        label: labels.name,
        searchValue: (row) =>
          `${row.firstName} ${row.lastName} ${row.email ?? ""} ${row.phone ?? ""} ${row.caretaker?.name ?? ""} ${row.caretaker?.contact ?? ""}`,
      },
      cell: ({ row }) => {
        const link = href(row.original);
        const name = `${row.original.firstName} ${row.original.lastName}`;
        const { caretaker } = row.original;
        const contact =
          row.original.email ?? row.original.phone ?? caretaker?.contact;
        return (
          <div className="flex items-center gap-3">
            <PersonAvatar
              svg={row.original.avatar}
              photoUrl={row.original.photoUrl}
            />
            <div className="grid">
              <Link
                href={link}
                onClick={stopRowClick}
                className="font-medium hover:underline"
              >
                {name}
              </Link>
              {caretaker || contact ? (
                <span className="text-xs text-ink-soft">
                  {[
                    caretaker
                      ? formatMessage(
                          labels.via,
                          { name: caretaker.name },
                          locale,
                        )
                      : null,
                    contact,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
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
    {
      id: "caretaker",
      accessorFn: (row) => row.caretaker?.name ?? "",
      enableSorting: true,
      meta: { label: labels.caretaker },
      cell: ({ row }) =>
        row.original.caretaker ? (
          <Link
            href={`/admin/members/${row.original.caretaker.id}${scopeQuery}`}
            onClick={stopRowClick}
            className="text-ink-soft hover:text-ink hover:underline"
          >
            {row.original.caretaker.name}
          </Link>
        ) : null,
    },
    mutedColumn<PassengerRow>("pickup", labels.pickup, (row) => row.pickup, {
      sortable: true,
    }),
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
      locale={locale}
      initialHidden={["phone"]}
      rowHref={href}
      getRowId={(row) => row.id}
    />
  );
}
