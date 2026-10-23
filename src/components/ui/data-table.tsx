"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
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
  type Row,
  type RowData,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
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
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

export type DataTableMobileSlot =
  | "leading"
  | "title"
  | "subtitle"
  | "trailing"
  | "badge"
  | "actions"
  | "hidden";

type MobilePart = Exclude<DataTableMobileSlot, "hidden">;

export type DataTableMobileCells<TData> = Partial<
  Record<MobilePart, (row: TData) => ReactNode>
>;

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    searchValue?: (row: TData) => string;
    mobile?: DataTableMobileSlot | DataTableMobileCells<TData>;
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
  sort: string;
  ascending: string;
  descending: string;
};

export type DataTableFilter = {
  columnId: string;
  label: string;
  options: { value: string; label: string }[];
};

const GUTTERS = {
  page: { bleed: "-mx-4", inset: "pl-4", end: "pr-4" },
  drawer: { bleed: "-mx-5", inset: "pl-5", end: "pr-5" },
} as const;

export type DataTableGutter = keyof typeof GUTTERS;

const PARTS: MobilePart[] = [
  "leading",
  "title",
  "subtitle",
  "trailing",
  "badge",
  "actions",
];

const PILL = "h-8 rounded-full border-line px-3 text-2sm font-normal";

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

function FilterMenu({
  filter,
  value,
  onChange,
  strings,
  align,
  children,
}: {
  filter: DataTableFilter;
  value: string;
  onChange: (value: string) => void;
  strings: DataTableStrings;
  align: "start" | "end";
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
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

function HeaderFilter({
  filter,
  value,
  onChange,
  strings,
  locale,
}: {
  filter: DataTableFilter;
  value: string;
  onChange: (value: string) => void;
  strings: DataTableStrings;
  locale: Locale;
}) {
  const active = value !== ALL;
  return (
    <FilterMenu
      filter={filter}
      value={value}
      onChange={onChange}
      strings={strings}
      align="start"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={formatMessage(
          strings.filterAria,
          { column: filter.label },
          locale,
        )}
        className={cn(
          "size-8 text-ink-soft",
          active && "bg-mint text-ink hover:bg-mint",
        )}
      >
        <ListFilter aria-hidden />
      </Button>
    </FilterMenu>
  );
}

function FilterPill({
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
  const active = filter.options.find((option) => option.value === value);
  return (
    <FilterMenu
      filter={filter}
      value={value}
      onChange={onChange}
      strings={strings}
      align="start"
    >
      <Button
        variant="outline"
        className={cn(
          PILL,
          "max-w-full",
          active
            ? "border-transparent bg-mint text-ink hover:bg-mint"
            : "text-ink-soft",
        )}
      >
        <ListFilter aria-hidden />
        <span className="truncate">
          {active ? `${filter.label}: ${active.label}` : filter.label}
        </span>
      </Button>
    </FilterMenu>
  );
}

function SortPill<TData>({
  columns,
  sorting,
  onChange,
  strings,
  className,
}: {
  columns: Column<TData, unknown>[];
  sorting: SortingState;
  onChange: (sorting: SortingState) => void;
  strings: DataTableStrings;
  className?: string;
}) {
  const current = sorting[0];
  const column = columns.find((candidate) => candidate.id === current?.id);
  const label = column?.columnDef.meta?.label ?? strings.sort;
  const Icon = column ? (current.desc ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            PILL,
            "max-w-40",
            column
              ? "border-transparent bg-mint text-ink hover:bg-mint"
              : "text-ink-soft",
            className,
          )}
        >
          <Icon aria-hidden />
          <span className="truncate">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-48 rounded-2xl border-line p-2"
      >
        <DropdownMenuRadioGroup
          value={current?.id ?? ""}
          onValueChange={(id) =>
            onChange([{ id, desc: current?.desc ?? false }])
          }
        >
          {columns.map((candidate) => (
            <DropdownMenuRadioItem
              key={candidate.id}
              value={candidate.id}
              className="rounded-xl py-2.5"
            >
              {candidate.columnDef.meta?.label ?? candidate.id}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={current ? (current.desc ? "desc" : "asc") : ""}
          onValueChange={(direction) =>
            onChange([
              {
                id: current?.id ?? columns[0].id,
                desc: direction === "desc",
              },
            ])
          }
        >
          <DropdownMenuRadioItem
            value="asc"
            className="rounded-xl py-2.5"
          >
            <ArrowUp aria-hidden />
            {strings.ascending}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="desc"
            className="rounded-xl py-2.5"
          >
            <ArrowDown aria-hidden />
            {strings.descending}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const filled = (node: ReactNode) =>
  node !== null && node !== undefined && node !== false && node !== "";

function mobileParts<TData>(
  row: Row<TData>,
  firstColumnId: string | undefined,
) {
  const parts = Object.fromEntries(
    PARTS.map((part) => [part, [] as ReactNode[]]),
  ) as Record<MobilePart, ReactNode[]>;
  for (const cell of row.getVisibleCells()) {
    const mobile =
      cell.column.columnDef.meta?.mobile ??
      (cell.column.id === firstColumnId ? "title" : "hidden");
    if (mobile === "hidden") continue;
    if (typeof mobile === "string") {
      parts[mobile].push(
        <Fragment key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </Fragment>,
      );
      continue;
    }
    for (const part of PARTS) {
      const node = mobile[part]?.(row.original);
      if (filled(node))
        parts[part].push(
          <Fragment key={`${cell.id}:${part}`}>{node}</Fragment>,
        );
    }
  }
  return parts;
}

function MobileRow<TData>({
  row,
  href,
  titleId,
  firstColumnId,
  gutter,
}: {
  row: Row<TData>;
  href: string | undefined;
  titleId: string;
  firstColumnId: string | undefined;
  gutter: DataTableGutter;
}) {
  const { leading, title, subtitle, trailing, badge, actions } = mobileParts(
    row,
    firstColumnId,
  );
  const { inset, end } = GUTTERS[gutter];
  return (
    <li
      className={cn(
        "group relative flex items-stretch gap-3",
        inset,
        href && "active:bg-canvas-deep",
      )}
    >
      {href ? (
        <Link
          href={href}
          aria-labelledby={titleId}
          className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mint-deep"
        />
      ) : null}
      {leading.length > 0 ? (
        <div className="flex shrink-0 items-center py-2.75">{leading}</div>
      ) : null}
      <div
        className={cn(
          "flex min-h-11 min-w-0 flex-1 items-center gap-3 border-b border-line py-2.75 group-last:border-b-0",
          end,
        )}
      >
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div
            id={titleId}
            className="truncate text-sm font-medium text-ink"
          >
            {title}
          </div>
          {subtitle.length > 0 ? (
            <div className="truncate text-2sm text-ink-soft">
              {subtitle.map((part, index) => (
                <Fragment key={index}>
                  {index > 0 ? " · " : null}
                  {part}
                </Fragment>
              ))}
            </div>
          ) : null}
          {badge.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.25 pt-1">
              {badge}
            </div>
          ) : null}
        </div>
        {trailing.length > 0 ? (
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-right text-2sm text-ink-soft tabular-nums">
            {trailing}
          </div>
        ) : null}
        {actions.length > 0 ? (
          <div
            className="relative flex shrink-0 items-center gap-1.25"
            onClick={stopRowClick}
          >
            {actions}
          </div>
        ) : null}
        {href ? (
          <ChevronRight
            aria-hidden
            className="-mr-1 size-4 shrink-0 text-ink-faint"
          />
        ) : null}
      </div>
    </li>
  );
}

// ponytail: client-side paging over the full scope list; move filtering/paging to the service when a chapter exceeds a few thousand rows.
export function DataTable<TData>({
  columns,
  data,
  strings,
  locale,
  searchable = true,
  filters = [],
  rowHref,
  initialHidden = [],
  getRowId,
  gutter = "page",
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  strings: DataTableStrings;
  locale: Locale;
  searchable?: boolean;
  filters?: DataTableFilter[];
  rowHref?: (row: TData) => string | undefined;
  initialHidden?: string[];
  getRowId?: (row: TData) => string;
  gutter?: DataTableGutter;
}) {
  const router = useRouter();
  const listId = useId();
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

  const firstColumnId = table.getAllLeafColumns()[0]?.id;
  const visibleIds = new Set(
    table.getVisibleLeafColumns().map((column) => column.id),
  );
  const pillFilters = filters.filter((filter) =>
    visibleIds.has(filter.columnId),
  );
  const sortable = table
    .getVisibleLeafColumns()
    .filter((column) => column.getCanSort());
  const filterValue = (columnId: string) =>
    (table.getColumn(columnId)?.getFilterValue() as string | undefined) ?? ALL;
  const setFilter = (columnId: string, value: string) =>
    table
      .getColumn(columnId)
      ?.setFilterValue(value === ALL ? undefined : value);
  const sortPill = (className?: string) =>
    sortable.length > 0 ? (
      <SortPill
        columns={sortable}
        sorting={sorting}
        onChange={setSorting}
        strings={strings}
        className={className}
      />
    ) : null;
  const pageInfo = formatMessage(strings.pageInfo, { from, to, total }, locale);

  const closeSearch = () => {
    setGlobalFilter("");
    setSearchOpen(false);
  };

  return (
    <div className="grid gap-3">
      {searchable || pillFilters.length > 0 || sortable.length > 0 ? (
        <div className="grid gap-2 md:hidden">
          {searchable ? (
            <div className="flex items-center gap-1.25">
              <div className="relative flex-1">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft"
                />
                <Input
                  type="search"
                  value={globalFilter}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setGlobalFilter("");
                  }}
                  placeholder={strings.search}
                  aria-label={strings.search}
                  className="h-10 rounded-xl border-transparent bg-canvas-deep pr-10 pl-9 shadow-none [&::-webkit-search-cancel-button]:hidden"
                />
                {globalFilter ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={strings.clearSearch}
                    onClick={() => setGlobalFilter("")}
                    className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-ink-soft"
                  >
                    <X aria-hidden />
                  </Button>
                ) : null}
              </div>
              {sortPill("h-10 rounded-xl")}
            </div>
          ) : null}
          {pillFilters.length > 0 || (!searchable && sortable.length > 0) ? (
            <div className="flex flex-wrap items-center gap-1.25">
              {pillFilters.map((filter) => (
                <FilterPill
                  key={filter.columnId}
                  filter={filter}
                  value={filterValue(filter.columnId)}
                  onChange={(value) => setFilter(filter.columnId, value)}
                  strings={strings}
                />
              ))}
              {searchable ? null : <div className="ml-auto">{sortPill()}</div>}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn("md:hidden", GUTTERS[gutter].bleed)}>
        {rows.length === 0 ? (
          <p className="border-y border-line px-4 py-10 text-center text-sm text-ink-soft">
            {strings.noResults}
          </p>
        ) : (
          <ul className="border-y border-line">
            {rows.map((row) => (
              <MobileRow
                key={row.id}
                row={row}
                href={rowHref?.(row.original)}
                titleId={`${listId}-${row.id}`}
                firstColumnId={firstColumnId}
                gutter={gutter}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
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
                            aria-label={formatMessage(
                              strings.sortAria,
                              { column: label },
                              locale,
                            )}
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
                            locale={locale}
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

      <div className="flex items-center justify-between gap-3 text-sm text-ink-soft md:hidden">
        {pageCount > 1 ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={strings.previous}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="size-11 text-ink"
          >
            <ChevronLeft aria-hidden />
          </Button>
        ) : null}
        <span className="flex-1 text-center tabular-nums">{pageInfo}</span>
        {pageCount > 1 ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={strings.next}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="size-11 text-ink"
          >
            <ChevronRight aria-hidden />
          </Button>
        ) : null}
      </div>

      <div className="hidden flex-wrap items-center gap-3 text-sm text-ink-soft md:flex">
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
                      aria-label={formatMessage(
                        strings.page,
                        { page: page + 1 },
                        locale,
                      )}
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
        <span className="ml-auto">{pageInfo}</span>
      </div>
    </div>
  );
}
