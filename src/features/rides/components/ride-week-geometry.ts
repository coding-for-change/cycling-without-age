import {
  daySegment,
  instantAt,
  MINUTES_IN_DAY,
  wallClock,
  type Span,
} from "@/lib/calendar";
import { CLOCK_STEP_MINUTES } from "@/lib/clock";

export type Band = { from: number; to: number };
export type Segment = { from: number; to: number };
export type WeekDay = { key: string; start: Date; end: Date };

const DEFAULT_BAND: Band = { from: 8, to: 18 };

export function visibleBand(segments: Segment[]): Band {
  if (!segments.length) return DEFAULT_BAND;
  let from = DEFAULT_BAND.from;
  let to = DEFAULT_BAND.to;
  for (const segment of segments) {
    from = Math.min(from, Math.floor(segment.from / 60));
    to = Math.max(to, Math.ceil(segment.to / 60));
  }
  return {
    from: Math.max(0, from - 1),
    to: Math.min(MINUTES_IN_DAY / 60, to + 1),
  };
}

export function segmentsOf<T extends Span>(
  items: T[],
  day: WeekDay,
  timeZone: string,
) {
  const touching: { item: T; segment: Segment }[] = [];
  for (const item of items) {
    const segment = daySegment(item, day.start, day.end, timeZone);
    if (segment) touching.push({ item, segment });
  }
  return touching;
}

export const snap = (minutes: number) =>
  Math.round(minutes / CLOCK_STEP_MINUTES) * CLOCK_STEP_MINUTES;

export const snapDown = (minutes: number) =>
  Math.floor(minutes / CLOCK_STEP_MINUTES) * CLOCK_STEP_MINUTES;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function instantOn(day: WeekDay, minutes: number, timeZone: string) {
  if (minutes >= MINUTES_IN_DAY) return day.end;
  const { year, month, day: date } = wallClock(day.start, timeZone);
  return instantAt(
    {
      year,
      month,
      day: date,
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
    },
    timeZone,
  );
}

export function minuteAt(clientY: number, rect: DOMRect, band: Band) {
  const span = (band.to - band.from) * 60;
  const ratio = clamp((clientY - rect.top) / rect.height, 0, 1);
  return band.from * 60 + ratio * span;
}
