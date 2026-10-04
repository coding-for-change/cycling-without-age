import type { ReactNode } from "react";
import { ReportDim } from "./report-nav";

export type ReportGridSlots = {
  filterBar: ReactNode;
  kpis: ReactNode;
  trend: ReactNode;
  place: ReactNode;
  rankings: ReactNode;
  breakdowns: ReactNode;
};

export function ReportGrid({
  filterBar,
  kpis,
  trend,
  place,
  rankings,
  breakdowns,
}: ReportGridSlots) {
  return (
    <div className="flex flex-col gap-5">
      {filterBar}
      <ReportDim className="flex flex-col gap-5">
        {kpis}
        {trend}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="flex min-w-0 flex-col *:flex-1">{place}</div>
          <div className="flex min-w-0 flex-col *:flex-1">{rankings}</div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {breakdowns}
        </div>
      </ReportDim>
    </div>
  );
}
