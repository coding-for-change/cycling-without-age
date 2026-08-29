"use client";

/* Responsive table: desktop table + mobile record-card list from one spec. */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Col<T> {
  label: string;
  render: (row: T) => ReactNode;
}

export function ResponsiveTable<T extends { id: string }>({
  rows,
  cols,
  card,
  onRow,
}: {
  rows: T[];
  cols: Col<T>[];
  card: (row: T) => ReactNode;
  onRow?: (row: T) => void;
}) {
  return (
    <>
      <div className="table-wrap table-desktop">
        <table className="table">
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={i}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={cn(onRow && "clickable")}
                onClick={onRow ? () => onRow(r) : undefined}
              >
                {cols.map((c, i) => (
                  <td key={i}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cards-mobile">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            className="record-card"
            onClick={onRow ? () => onRow(r) : undefined}
          >
            {card(r)}
          </button>
        ))}
      </div>
    </>
  );
}
