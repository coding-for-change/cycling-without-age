import { TZDate } from "@date-fns/tz";
import { z } from "zod";

export const REPORT_RANGE_PRESETS = [
  "7d",
  "30d",
  "90d",
  "ytd",
  "12m",
  "all",
] as const;
export const DEFAULT_REPORT_RANGE = "30d" satisfies ReportRangePreset;
export const REPORT_FLOOR = "2015-01-01";

export type ReportRangePreset = (typeof REPORT_RANGE_PRESETS)[number];
export type ReportGrain = "day" | "week" | "month";

export type ReportRangeParams = {
  range?: string | null;
  from?: string | null;
  to?: string | null;
};

export type ReportPeriod = { from: string; to: string };

export type ReportShift = { unit: "day" | "year"; amount: number };

export type ReportRange = {
  preset: ReportRangePreset | "custom";
  from: string;
  to: string;
  last: string;
  days: number;
  grain: ReportGrain;
  previous: ReportPeriod;
  shift: ReportShift;
};

const DAY_MS = 86_400_000;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const parse = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

const print = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const realDate = (value: string) =>
  isoDate.safeParse(value).success && print(parse(value)) === value;

export const addDays = (date: string, days: number) =>
  print(parse(date) + days * DAY_MS);

export const addMonths = (date: string, months: number) => {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return print(target.getTime());
};

export const daysBetween = (from: string, to: string) =>
  Math.round((parse(to) - parse(from)) / DAY_MS);

const startOfMonth = (date: string) => `${date.slice(0, 7)}-01`;

const startOfWeek = (date: string) => {
  const weekday = new Date(parse(date)).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
};

export const grainFor = (days: number): ReportGrain =>
  days <= 31 ? "day" : days <= 184 ? "week" : "month";

export const bucketKey = (date: string, grain: ReportGrain) =>
  grain === "day"
    ? date
    : grain === "week"
      ? startOfWeek(date)
      : startOfMonth(date);

const nextBucket = (key: string, grain: ReportGrain) =>
  grain === "day"
    ? addDays(key, 1)
    : grain === "week"
      ? addDays(key, 7)
      : addMonths(key, 1);

export function bucketKeys(period: ReportPeriod, grain: ReportGrain) {
  const keys: string[] = [];
  for (
    let key = bucketKey(period.from, grain);
    key < period.to;
    key = nextBucket(key, grain)
  )
    keys.push(key);
  return keys;
}

export const shiftForward = (date: string, shift: ReportShift) =>
  shift.unit === "day"
    ? addDays(date, shift.amount)
    : addMonths(date, 12 * shift.amount);

export function localDate(instant: Date, timeZone: string) {
  const local = new TZDate(instant.getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}

export function localMidnight(date: string, timeZone: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, timeZone).getTime());
}

const ZONE_SPREAD_MS = 14 * 60 * 60_000;

export const periodBounds = (period: ReportPeriod) => ({
  from: new Date(parse(period.from) - ZONE_SPREAD_MS),
  to: new Date(parse(period.to) + ZONE_SPREAD_MS),
});

const rangeParams = z.union([
  z.object({ from: isoDate.refine(realDate), to: isoDate.refine(realDate) }),
  z.object({ range: z.enum(REPORT_RANGE_PRESETS) }),
]);

function build(
  preset: ReportRange["preset"],
  from: string,
  to: string,
  shift: ReportShift,
): ReportRange {
  const days = daysBetween(from, to);
  const back = (date: string) =>
    shift.unit === "day"
      ? addDays(date, -shift.amount)
      : addMonths(date, -12 * shift.amount);
  return {
    preset,
    from,
    to,
    last: addDays(to, -1),
    days,
    grain: grainFor(days),
    previous: { from: back(from), to: back(to) },
    shift,
  };
}

function presetRange(
  preset: ReportRangePreset,
  today: string,
  earliest: string | null,
): ReportRange {
  const to = addDays(today, 1);
  switch (preset) {
    case "7d":
    case "30d":
    case "90d": {
      const days = Number.parseInt(preset, 10);
      return build(preset, addDays(to, -days), to, {
        unit: "day",
        amount: days,
      });
    }
    case "ytd":
      return build(preset, `${today.slice(0, 4)}-01-01`, to, {
        unit: "year",
        amount: 1,
      });
    case "12m":
      return build(preset, addMonths(startOfMonth(today), -11), to, {
        unit: "year",
        amount: 1,
      });
    case "all": {
      const first = earliest ?? addMonths(startOfMonth(today), -11);
      const start = startOfMonth(
        first < REPORT_FLOOR ? REPORT_FLOOR : first > today ? today : first,
      );
      const days = daysBetween(start, to);
      return build(preset, start, to, { unit: "day", amount: days });
    }
  }
}

export function reportRangeParams(params: ReportRangeParams): {
  range?: ReportRangePreset;
  from?: string;
  to?: string;
} {
  const parsed = rangeParams.safeParse({
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(params.range ? { range: params.range } : {}),
  });
  return parsed.success ? parsed.data : {};
}

export function resolveReportRange(
  params: ReportRangeParams,
  { today, earliest = null }: { today: string; earliest?: string | null },
): ReportRange {
  const parsed = reportRangeParams(params);
  if (parsed.from && parsed.to) {
    const last = parsed.to > today ? today : parsed.to;
    const from = parsed.from < REPORT_FLOOR ? REPORT_FLOOR : parsed.from;
    if (from > last) return presetRange(DEFAULT_REPORT_RANGE, today, earliest);
    const to = addDays(last, 1);
    return build("custom", from, to, {
      unit: "day",
      amount: daysBetween(from, to),
    });
  }
  return presetRange(parsed.range ?? DEFAULT_REPORT_RANGE, today, earliest);
}
