import { offsetMinutes } from "@/lib/calendar";
import {
  periodBounds,
  type ReportGrain,
  type ReportPeriod,
  type ReportRange,
  type ReportShift,
} from "./report-range";

export type ReportSide = "current" | "previous";

export type ZoneShift = { since: Date; until: Date; minutes: number };

export type ReportWindow = { from: Date; to: Date };

export type ReportScope = {
  chapterIds: string[];
  chapterZones: {
    chapterId: string;
    zone: number;
    firstInstant: Record<ReportSide, Date>;
  }[];
  zoneShifts: ZoneShift[][];
  windows: Record<ReportSide, ReportWindow>;
  periods: Record<ReportSide, ReportPeriod>;
  grain: ReportGrain;
  shift: ReportShift;
  now: Date;
};

const MINUTE_MS = 60_000;
const PROBE_MS = 14 * 86_400_000;

const offsetAt = (ms: number, timeZone: string) =>
  offsetMinutes(new Date(ms), timeZone);

export function zoneShifts(
  timeZone: string,
  from: Date,
  to: Date,
): ZoneShift[] {
  const end = to.getTime();
  const shifts: ZoneShift[] = [];
  let since = from.getTime();
  let minutes = offsetAt(since, timeZone);
  let probe = since;
  while (probe < end) {
    const next = Math.min(probe + PROBE_MS, end);
    if (offsetAt(next, timeZone) === minutes) {
      probe = next;
      continue;
    }
    let lo = probe;
    let hi = next;
    while (hi - lo > MINUTE_MS) {
      const mid = lo + Math.floor((hi - lo) / (2 * MINUTE_MS)) * MINUTE_MS;
      if (offsetAt(mid, timeZone) === minutes) lo = mid;
      else hi = mid;
    }
    if (hi >= end) break;
    shifts.push({ since: new Date(since), until: new Date(hi), minutes });
    since = hi;
    minutes = offsetAt(hi, timeZone);
    probe = hi;
  }
  shifts.push({ since: new Date(since), until: new Date(end), minutes });
  return shifts;
}

export function firstInstantOf(date: string, shifts: ZoneShift[]): Date {
  const midnight = Date.parse(`${date}T00:00:00Z`);
  for (const { since, until, minutes } of shifts) {
    const at = Math.max(since.getTime(), midnight - minutes * MINUTE_MS);
    if (at < until.getTime()) return new Date(at);
  }
  return new Date(midnight - (shifts.at(-1)?.minutes ?? 0) * MINUTE_MS);
}

export function reportScope(
  chapters: { id: string; timeZone: string }[],
  range: ReportRange,
  now: Date,
): ReportScope {
  const windows = {
    current: periodBounds(range),
    previous: periodBounds(range.previous),
  };
  const periods = {
    current: { from: range.from, to: range.to },
    previous: range.previous,
  };
  const from = new Date(
    Math.min(windows.current.from.getTime(), windows.previous.from.getTime()),
  );
  const to = new Date(
    Math.max(windows.current.to.getTime(), windows.previous.to.getTime()),
  );
  const zones = [...new Set(chapters.map((c) => c.timeZone))];
  const shifts = zones.map((timeZone) => zoneShifts(timeZone, from, to));

  return {
    chapterIds: chapters.map((c) => c.id),
    chapterZones: chapters.map((c) => {
      const zone = zones.indexOf(c.timeZone);
      return {
        chapterId: c.id,
        zone,
        firstInstant: {
          current: firstInstantOf(periods.current.from, shifts[zone]),
          previous: firstInstantOf(periods.previous.from, shifts[zone]),
        },
      };
    }),
    zoneShifts: shifts,
    windows,
    periods,
    grain: range.grain,
    shift: range.shift,
    now,
  };
}
