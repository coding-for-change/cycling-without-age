"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AppDrawer } from "@/components/app-drawer";
import { DataTable, type DataTableStrings } from "@/components/ui/data-table";
import { metric as metricOf } from "@/features/rides/report";
import { formatNumber, type Locale } from "@/lib/format";
import { formatMessage } from "@/lib/i18n/format";
import type { Locale as Language } from "@/lib/i18n/locales";
import {
  formatRankValue,
  rankEntries,
  type RankingEntry,
  type RankingsStrings,
} from "./ranking-entries";
import { metricValue, type RankMetric, type RankingTab } from "./ranking-model";

type DrawerRow = RankingEntry & {
  rank: number | null;
  perPilot: number | null;
  change: number | null;
};

const LAST = Number.MAX_SAFE_INTEGER;

export function RankingDrawer({
  tab,
  entries,
  metric,
  periodLabel,
  onClose,
  notation,
  language,
  strings,
  tableStrings,
}: {
  tab: RankingTab | null;
  entries: RankingEntry[];
  metric: RankMetric;
  periodLabel: string;
  onClose: () => void;
  notation: Locale;
  language: Language;
  strings: RankingsStrings;
  tableStrings: DataTableStrings;
}) {
  const rows = useMemo<DrawerRow[]>(() => {
    const ranks = new Map(
      rankEntries(entries, metric).map((ranked) => [
        ranked.row.key,
        ranked.rank,
      ]),
    );
    return entries
      .map((entry) => ({
        ...entry,
        rank: ranks.get(entry.key) ?? null,
        perPilot: metricValue(entry.tally, "perPilot").current,
        change: metricOf(entry.tally.rides, entry.tally.previousRides).delta,
      }))
      .sort((a, b) => (a.rank ?? LAST) - (b.rank ?? LAST));
  }, [entries, metric]);

  const columns = useMemo<ColumnDef<DrawerRow, unknown>[]>(() => {
    const number = (value: number | null, digits = 0) =>
      value === null
        ? "–"
        : formatNumber(value, notation, { maximumFractionDigits: digits });
    const numeric = (
      id: string,
      label: string,
      get: (row: DrawerRow) => number | null,
      render: (row: DrawerRow) => string,
    ): ColumnDef<DrawerRow, unknown> => ({
      id,
      accessorFn: (row) => get(row) ?? -1,
      enableHiding: true,
      meta: { label },
      cell: ({ row }) => (
        <span className="text-ink tabular-nums">{render(row.original)}</span>
      ),
    });

    const all: (ColumnDef<DrawerRow, unknown> | null)[] = [
      {
        id: "rank",
        accessorFn: (row) => row.rank ?? LAST,
        enableHiding: false,
        meta: { label: strings.columns.rank },
        cell: ({ row }) => (
          <span className="text-ink-faint tabular-nums">
            {row.original.rank ?? "–"}
          </span>
        ),
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        enableHiding: false,
        meta: {
          label: strings.columns.name,
          searchValue: (row) => `${row.name} ${row.detail ?? ""}`,
        },
        cell: ({ row }) => (
          <span className="grid">
            <span className="font-medium text-ink">{row.original.name}</span>
            {row.original.detail ? (
              <span className="text-xs text-ink-soft">
                {row.original.detail}
              </span>
            ) : null}
          </span>
        ),
      },
      numeric(
        "rides",
        strings.columns.rides,
        (row) => row.tally.rides,
        (row) => number(row.tally.rides),
      ),
      tab === "riders"
        ? null
        : numeric(
            "trips",
            strings.columns.trips,
            (row) => row.tally.trips,
            (row) => number(row.tally.trips),
          ),
      numeric(
        "hours",
        strings.columns.hours,
        (row) => row.tally.hours,
        (row) =>
          formatRankValue(
            row.tally.hours,
            "hours",
            notation,
            language,
            strings,
          ),
      ),
      tab === "chapters"
        ? numeric(
            "activePilots",
            strings.columns.activePilots,
            (row) => row.tally.activePilots ?? null,
            (row) => number(row.tally.activePilots ?? null),
          )
        : null,
      tab === "chapters"
        ? numeric(
            "perPilot",
            strings.columns.perPilot,
            (row) => row.perPilot,
            (row) => number(row.perPilot, 1),
          )
        : null,
      {
        id: "change",
        accessorFn: (row) => row.change ?? -LAST,
        meta: { label: strings.columns.change },
        cell: ({ row }) => (
          <span className="text-ink-soft tabular-nums">
            {row.original.change === null
              ? "–"
              : formatNumber(row.original.change, notation, {
                  style: "percent",
                  signDisplay: "exceptZero",
                  maximumFractionDigits: 0,
                })}
          </span>
        ),
      },
    ];
    return all.filter((column): column is ColumnDef<DrawerRow, unknown> =>
      Boolean(column),
    );
  }, [tab, notation, language, strings]);

  return (
    <AppDrawer
      open={tab !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      title={tab ? strings.drawer[tab] : ""}
      description={formatMessage(
        strings.drawer.description,
        { period: periodLabel },
        language,
      )}
    >
      {tab ? (
        <DataTable
          key={`${tab}:${metric}`}
          columns={columns}
          data={rows}
          strings={tableStrings}
          locale={language}
          rowHref={(row) => row.href}
          getRowId={(row) => row.key}
        />
      ) : null}
    </AppDrawer>
  );
}
