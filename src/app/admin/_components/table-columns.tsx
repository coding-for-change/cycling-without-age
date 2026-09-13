import type { ColumnDef, FilterFnOption } from "@tanstack/react-table";

/**
 * A secondary column in an admin table: the value in muted ink, sorted on its
 * ISO twin where the shown value is a formatted date. Every admin list wants
 * the same thing, so the shape lives here rather than in each table.
 */
export function mutedColumn<T>(
  id: string,
  label: string,
  get: (row: T) => string | number | null | undefined,
  options: {
    /** The machine-readable twin to sort on, for a formatted date. */
    isoOf?: (row: T) => string;
    /** Sort on the shown value itself — for a number, say. */
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
