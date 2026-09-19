import type { ColumnDef, FilterFnOption } from "@tanstack/react-table";

export function mutedColumn<T>(
  id: string,
  label: string,
  get: (row: T) => string | number | null | undefined,
  options: {
    isoOf?: (row: T) => string;
    sortable?: boolean;
    filterFn?: FilterFnOption<T>;
  } = {},
): ColumnDef<T, unknown> {
  const { isoOf, sortable, filterFn } = options;
  return {
    id,
    accessorFn: (row) => get(row) ?? "",
    meta: { label },
    ...(filterFn ? { filterFn } : {}),
    ...(isoOf
      ? {
          enableSorting: true,
          sortingFn: (a, b) =>
            isoOf(a.original).localeCompare(isoOf(b.original)),
        }
      : sortable
        ? { enableSorting: true }
        : {}),
    cell: ({ row }) => (
      <span className="text-ink-soft">{get(row.original)}</span>
    ),
  };
}
