"use client";

/* Week calendar: rides bucketed into day/hour cells; closed hours hatched. */

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  chapterOf,
  mucRides,
  rideWho,
  rideHref,
  pad2,
  sameDay,
} from "../parts";

export default function CalendarPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const db = useStore((s) => s.db)!;
  const [weekOffset, setWeekOffset] = useState(0);
  const [today] = useState(() => Date.now());

  const ch = chapterOf(db);
  const mon = new Date(today);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) + weekOffset * 7);
  const weekStart = mon.getTime();
  const weekEnd = weekStart + 7 * 864e5;

  /* bucket rides into day/hour cells */
  const cells: Record<string, ReactNode[]> = {};
  mucRides(db).forEach((r) => {
    if (r.status === "cancelled" || r.ts < weekStart || r.ts >= weekEnd) return;
    const dt = new Date(r.ts);
    const day = (dt.getDay() + 6) % 7;
    const h = dt.getHours();
    if (h < 8 || h > 19) return;
    const key = `${day}-${h}`;
    (cells[key] = cells[key] || []).push(
      <span
        key={r.id}
        role="button"
        tabIndex={0}
        className={`cal-event status-${r.status}`}
        onClick={() => router.push(rideHref(r))}
        onKeyDown={(e) => {
          if (e.key === "Enter") router.push(rideHref(r));
        }}
      >
        {fmt.time(r.ts)} {rideWho(db, r).split(" ")[0]}
      </span>,
    );
  });

  const opDays = ch?.operatingDays || [1, 2, 3, 4, 5, 6];
  const hours: number[] = [];
  for (let h = 8; h <= 19; h++) hours.push(h);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">{t("admin.nav.calendar")}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="icon-pill"
            onClick={() => setWeekOffset(weekOffset - 1)}
            aria-label={t("admin.cal.prev")}
          >
            <Icon name="chevronLeft" />
          </button>
          <span className="font-semibold tabular-nums">
            {fmt.date(weekStart)} – {fmt.date(weekEnd - 864e5)}
          </span>
          <button
            type="button"
            className="icon-pill"
            onClick={() => setWeekOffset(weekOffset + 1)}
            aria-label={t("admin.cal.next")}
          >
            <Icon name="chevronRight" />
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setWeekOffset(0)}
          >
            {t("common.today")}
          </button>
        </div>
      </div>

      <div className="scroll-x">
        <div className="cal-grid">
          <div className="cal-head" />
          {Array.from({ length: 7 }, (_, i) => {
            const dayTs = weekStart + i * 864e5;
            return (
              <div
                key={i}
                className={cn("cal-head", sameDay(dayTs, today) && "today")}
              >
                <div className="dow">{fmt.weekday(dayTs)}</div>
                <div>{new Date(dayTs).getDate()}</div>
              </div>
            );
          })}
          {hours.map((h) => (
            <CalRow
              key={h}
              h={h}
              weekStart={weekStart}
              opDays={opDays}
              openHour={ch?.openHour ?? 9}
              closeHour={ch?.closeHour ?? 18}
              cells={cells}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["requested", "open", "staffed", "done"] as const).map((s) => (
          <span
            key={s}
            className={`cal-event status-${s}`}
          >
            {t(`status.${s}`)}
          </span>
        ))}
        <span className="badge badge-outline">{t("admin.cal.closed")}</span>
      </div>
    </>
  );
}

function CalRow({
  h,
  weekStart,
  opDays,
  openHour,
  closeHour,
  cells,
}: {
  h: number;
  weekStart: number;
  opDays: number[];
  openHour: number;
  closeHour: number;
  cells: Record<string, ReactNode[]>;
}) {
  return (
    <>
      <div className="cal-hour">{pad2(h)}:00</div>
      {Array.from({ length: 7 }, (_, i) => {
        const jsDay = new Date(weekStart + i * 864e5).getDay();
        const closed =
          !opDays.includes(jsDay) || h < openHour || h >= closeHour;
        return (
          <div
            key={i}
            className={cn("cal-cell", closed && "closed")}
          >
            {cells[`${i}-${h}`] || null}
          </div>
        );
      })}
    </>
  );
}
