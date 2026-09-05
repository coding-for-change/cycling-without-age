"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  stopRowClick,
  type DataTableStrings,
} from "@/components/ui/data-table";
import {
  ChapterFormDialog,
  type ChapterFormLabels,
} from "./chapter-form-dialog";

export type ChapterRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  countryId: string;
  countryName: string;
  address: string | null;
  careHomeName: string | null;
  description: string | null;
  logo: string | null;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
};

export function ChaptersTable({
  rows,
  countries,
  labels,
  table,
}: {
  rows: ChapterRow[];
  countries: { id: string; name: string }[];
  labels: ChapterFormLabels & { empty: string };
  table: DataTableStrings;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<ChapterRow | null>(null);

  const creating = searchParams.get("new") === "1";

  const close = () => {
    setEditing(null);
    if (!creating) return;
    const params = new URLSearchParams(searchParams);
    params.delete("new");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const done = () => {
    close();
    router.refresh();
  };

  const columns: ColumnDef<ChapterRow, unknown>[] = [
    {
      id: "name",
      accessorFn: (row) => row.name,
      enableHiding: false,
      enableSorting: true,
      meta: { label: labels.fields.name },
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: "slug",
      accessorFn: (row) => row.slug,
      meta: { label: labels.fields.slug },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-ink-soft">
          {row.original.slug}
        </span>
      ),
    },
    {
      id: "city",
      accessorFn: (row) => row.city,
      meta: { label: labels.fields.city },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.city}</span>
      ),
    },
    {
      id: "country",
      accessorFn: (row) => row.countryName,
      meta: { label: labels.fields.country },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.countryName}</span>
      ),
    },
    {
      id: "serviceRadiusKm",
      accessorFn: (row) => row.serviceRadiusKm,
      enableSorting: true,
      meta: { label: labels.fields.serviceRadiusKm },
      cell: ({ row }) => (
        <span className="text-ink-soft">{row.original.serviceRadiusKm}</span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div
          className="flex justify-end"
          onClick={stopRowClick}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={labels.edit}
            onClick={() => setEditing(row.original)}
          >
            <Pencil aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line px-4 py-10 text-center text-sm text-ink-soft">
          {labels.empty}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          strings={table}
          filters={
            countries.length > 1
              ? [
                  {
                    columnId: "country",
                    label: labels.fields.country,
                    options: countries.map((country) => ({
                      value: country.name,
                      label: country.name,
                    })),
                  },
                ]
              : []
          }
          getRowId={(row) => row.id}
        />
      )}
      <ChapterFormDialog
        key={editing?.id ?? "new"}
        open={creating || editing !== null}
        chapter={editing}
        countries={countries}
        labels={labels}
        onClose={close}
        onDone={done}
      />
    </>
  );
}
