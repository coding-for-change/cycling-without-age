"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type RowData,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  ListFilter,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, fill } from "@/lib/utils";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    searchValue?: (row: TData) => string;
  }
}

export type DataTableStrings = {
  search: string;
  clearSearch: string;
  columns: string;
  noResults: string;
  pageInfo: string;
  page: string;
  previous: string;
  next: string;
  all: string;
  sortAria: string;
  filterAria: string;
};

export type DataTableFilter = {
  columnId: string;
  label: string;
  options: { value: string; label: string }[];
};

const ALL = "__all__";
const PAGE_SIZE = 25;
const GAP = -1;

export const stopRowClick = (event: SyntheticEvent) => event.stopPropagation();

const text = (value: unknown) =>
  Array.isArray(value) ? value.join(" ") : value == null ? "" : String(value);

const pageList = (current: number, count: number) => {
  const shown = [...new Set([0, current - 1, current, current + 1, count - 1])]
    .filter((page) => page >= 0 && page < count)
    .sort((a, b) => a - b);
  return shown.flatMap((page, index) =>
    index > 0 && page - shown[index - 1] > 1 ? [GAP, page] : [page],
  );
};

function ColumnsMenu<TData>({
  columns,
  strings,
}: {
  columns: Column<TData, unknown>[];
  strings: DataTableStrings;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={strings.columns}
          className="ml-auto size-8 text-ink-soft"
        >
          <Columns3 aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-48 rounded-2xl border-line p-2"
      >
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(value) => {
              if (!value) column.setFilterValue(undefined);
              column.toggleVisibility(!!value);
            }}
            className="rounded-xl py-2.5"
          >
            {column.columnDef.meta?.label ?? column.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderFilter({
  filter,
  value,
  onChange,
  strings,
}: {
  filter: DataTableFilter;
  value: string;
  onChange: (value: string) => void;
  strings: DataTableStrings;
}) {
  const active = value !== ALL;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={fill(strings.filterAria, { column: filter.label })}
          className={cn(
            "size-8 text-ink-soft",
            active && "bg-mint text-ink hover:bg-mint",
          )}
        >
          <ListFilter aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-48 rounded-2xl border-line p-2"
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={onChange}
        >
          <DropdownMenuRadioItem
            value={ALL}
            className="rounded-xl py-2.5"
          >
            {strings.all}
          </DropdownMenuRadioItem>
          {filter.options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="rounded-xl py-2.5"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ponytail: client-side paging over the full scope list; move filtering/paging to the service when a chapter exceeds a few thousand rows.
export function DataTable<TData>({
  columns,
  data,
  strings,
  searchable = true,
  filters = [],
  rowHref,
  initialHidden = [],
  getRowId,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  strings: DataTableStrings;
  searchable?: boolean;
  filters?: DataTableFilter[];
  rowHref?: (row: TData) => string | undefined;
  initialHidden?: string[];
  getRowId?: (row: TData) => string;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => Object.fromEntries(initialHidden.map((id) => [id, false])),
  );

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const globalFilterFn = useMemo<FilterFn<TData>>(
    () => (row, columnId, value) => {
      const needle = String(value).trim().toLowerCase();
      if (!needle) return true;
      const column = row
        .getAllCells()
        .find((cell) => cell.column.id === columnId)?.column;
      const searchValue = column?.columnDef.meta?.searchValue;
      const haystack = searchValue
        ? searchValue(row.original)
        : text(row.getValue(columnId));
      return haystack.toLowerCase().includes(needle);
    },
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
    getRowId,
    globalFilterFn,
    getColumnCanGlobalFilter: () => true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const from = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const to = Math.min(total, (pageIndex + 1) * PAGE_SIZE);
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());
  const filterByColumn = useMemo(
    () => new Map(filters.map((filter) => [filter.columnId, filter])),
    [filters],
  );

  const closeSearch = () => {
    setGlobalFilter("");
    setSearchOpen(false);
  };

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-2xl border border-line">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow
                key={group.id}
                className="bg-canvas-deep hover:bg-canvas-deep"
              >
                {group.headers.map((header, index) => {
                  const sorted = header.column.getIsSorted();
                  const label = header.column.columnDef.meta?.label ?? "";
                  const sortable = header.column.getCanSort();
                  const withSearch = searchable && index === 0;
                  const filter = filterByColumn.get(header.column.id);
                  const withColumns =
                    hideable.length > 0 && index === group.headers.length - 1;
                  return (
                    <TableHead
                      key={header.id}
                      className="px-4 text-ink-soft"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : sortable
                              ? "none"
                              : undefined
                      }
                    >
                      <div className="flex items-center gap-1">
                        {withSearch && searchOpen ? null : sortable ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            aria-label={fill(strings.sortAria, {
                              column: label,
                            })}
                            className="group -mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2"
                          >
                            {label}
                            {sorted === "asc" ? (
                              <ArrowUp
                                aria-hidden
                                className="size-3.5"
                              />
                            ) : sorted === "desc" ? (
                              <ArrowDown
                                aria-hidden
                                className="size-3.5"
                              />
                            ) : (
                              <ArrowUpDown
                                aria-hidden
                                className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                              />
                            )}
                          </button>
                        ) : (
                          label
                        )}
                        {withSearch ? (
                          <>
                            {searchOpen ? null : (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={strings.search}
                                onClick={() => setSearchOpen(true)}
                                className="size-8 text-ink-soft"
                              >
                                <Search aria-hidden />
                              </Button>
                            )}
                            <Input
                              ref={searchRef}
                              value={globalFilter}
                              onChange={(event) =>
                                setGlobalFilter(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Escape") closeSearch();
                              }}
                              onBlur={() => {
                                if (!globalFilter) setSearchOpen(false);
                              }}
                              placeholder={strings.search}
                              aria-label={strings.search}
                              aria-hidden={!searchOpen}
                              tabIndex={searchOpen ? undefined : -1}
                              className={cn(
                                "h-9 bg-canvas transition-[width,opacity] duration-200 motion-reduce:transition-none",
                                searchOpen
                                  ? "w-56 border-line opacity-100"
                                  : "w-0 border-0 p-0 opacity-0",
                              )}
                            />
                            {searchOpen ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={strings.clearSearch}
                                onClick={closeSearch}
                                className="size-8 text-ink-soft"
                              >
                                <X aria-hidden />
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                        {filter ? (
                          <HeaderFilter
                            filter={filter}
                            value={
                              (header.column.getFilterValue() as string) ?? ALL
                            }
                            onChange={(value) =>
                              header.column.setFilterValue(
                                value === ALL ? undefined : value,
                              )
                            }
                            strings={strings}
                          />
                        ) : null}
                        {withColumns ? (
                          <ColumnsMenu
                            columns={hideable}
                            strings={strings}
                          />
                        ) : null}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="px-4 py-10 text-center text-ink-soft"
                >
                  {strings.noResults}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const href = rowHref?.(row.original);
                return (
                  <TableRow
                    key={row.id}
                    tabIndex={href ? 0 : undefined}
                    onClick={href ? () => router.push(href) : undefined}
                    onKeyDown={
                      href
                        ? (event) => {
                            if (event.key === "Enter") router.push(href);
                          }
                        : undefined
                    }
                    className={cn(
                      href && "cursor-pointer hover:bg-canvas-deep",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-4 py-3 align-top"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
        {pageCount > 1 ? (
          <Pagination className="mx-0 w-auto justify-start">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-label={strings.previous}
                  aria-disabled={!table.getCanPreviousPage()}
                  className={cn(
                    "min-h-11",
                    !table.getCanPreviousPage() &&
                      "pointer-events-none opacity-50",
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    table.previousPage();
                  }}
                >
                  {strings.previous}
                </PaginationPrevious>
              </PaginationItem>
              {pageList(pageIndex, pageCount).map((page, index) => (
                <PaginationItem key={page === GAP ? `gap-${index}` : page}>
                  {page === GAP ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href="#"
                      isActive={page === pageIndex}
                      aria-label={fill(strings.page, { page: page + 1 })}
                      className="min-h-11"
                      onClick={(event) => {
                        event.preventDefault();
                        table.setPageIndex(page);
                      }}
                    >
                      {page + 1}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-label={strings.next}
                  aria-disabled={!table.getCanNextPage()}
                  className={cn(
                    "min-h-11",
                    !table.getCanNextPage() && "pointer-events-none opacity-50",
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    table.nextPage();
                  }}
                >
                  {strings.next}
                </PaginationNext>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
        <span className="ml-auto">
          {fill(strings.pageInfo, { from, to, total })}
        </span>
      </div>
    </div>
  );
}
