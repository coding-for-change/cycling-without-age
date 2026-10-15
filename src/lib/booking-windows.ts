/**
 * When a rider may ask for a ride (lifecycle 1D): the chapter's riding hours,
 * minus its closures, no sooner than the booking lead time and no further
 * ahead than the booking horizon — all on the chapter's wall clock.
 *
 * Pure like `lib/calendar`: the request form draws its days and window chips
 * from here, and `use-cases/submit-ride-request` refuses with the same rules,
 * so the screen can never offer what the server would turn down.
 */
import {
  addDays,
  clockMinutes,
  dayKey,
  instantAt,
  MINUTES_IN_DAY,
  type Span,
} from "./calendar";
import { CLOCK_STEP_MINUTES } from "./clock";
import { formatTimeRange, type Locale } from "./format";
import {
  fitsHours,
  isClosedOn,
  isConfigured,
  windowsOn,
  type MinuteRange,
  type OperatingHours,
} from "./operating-hours";

export type BookingPolicy = {
  leadTimeHours: number;
  horizonDays: number;
  rideMinutes: number;
};

export type PartOfDay = "morning" | "afternoon" | "evening";

export type BookingWindow = {
  date: string;
  startMinute: number;
  endMinute: number;
  /** Set when a long stretch is offered whole — "Morning 09–12". */
  part: PartOfDay | null;
  startsAt: Date;
  endsAt: Date;
};

export type BookingDay = { date: string; windows: BookingWindow[] };

export type BookingRefusal =
  "leadTime" | "beyondHorizon" | "closedDate" | "outsideHours";

/** A stretch longer than this is one chip, not a row of hour slots. */
export const LONG_WINDOW_MINUTES = 180;

/** No window is longer than the longest ride a chapter can schedule. */
export const MAX_WINDOW_MINUTES = 12 * 60;

/** What a chapter that never set riding hours offers: it rides any day. */
export const OPEN_DAY: readonly MinuteRange[] = [
  { from: 9 * 60, to: 12 * 60 },
  { from: 13 * 60, to: 17 * 60 },
];

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const NOON = 12 * 60;
const EVENING = 17 * 60;

export const partOfDay = (startMinute: number): PartOfDay =>
  startMinute < NOON
    ? "morning"
    : startMinute < EVENING
      ? "afternoon"
      : "evening";

const dateParts = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
};

/** The instant a wall-clock minute of `date` shows; 1440 is the next midnight. */
export function instantOn(date: string, minute: number, timeZone: string) {
  const { year, month, day } = dateParts(date);
  const shifted = new Date(Date.UTC(year, month - 1, day, 0, minute));
  return instantAt(
    {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
    },
    timeZone,
  );
}

export const earliestStart = (policy: BookingPolicy, now: Date) =>
  new Date(now.getTime() + policy.leadTimeHours * HOUR_MS);

/** Midnight after the last bookable day: today plus the horizon. */
export const horizonEnd = (
  policy: BookingPolicy,
  timeZone: string,
  now: Date,
) =>
  instantOn(
    dayKey(addDays(now, policy.horizonDays, timeZone), timeZone),
    MINUTES_IN_DAY,
    timeZone,
  );

/** Every date from today to the last one the horizon reaches. */
export function bookingDates(
  policy: BookingPolicy,
  timeZone: string,
  now: Date,
): string[] {
  const dates: string[] = [];
  for (let offset = 0; offset <= policy.horizonDays; offset++)
    dates.push(dayKey(addDays(now, offset, timeZone), timeZone));
  return [...new Set(dates)];
}

const rangesOn = (hours: OperatingHours, date: string) =>
  isConfigured(hours) ? windowsOn(hours, date) : [...OPEN_DAY];

const ceilToStep = (minute: number) =>
  Math.ceil(minute / CLOCK_STEP_MINUTES) * CLOCK_STEP_MINUTES;

function chipsOf(range: MinuteRange, rideMinutes: number) {
  const length = range.to - range.from;
  if (length > LONG_WINDOW_MINUTES || rideMinutes >= length)
    return [{ ...range, long: length > LONG_WINDOW_MINUTES }];
  const chips: (MinuteRange & { long: boolean })[] = [];
  for (
    let from = range.from;
    from + rideMinutes <= range.to;
    from += rideMinutes
  )
    chips.push({ from, to: from + rideMinutes, long: false });
  return chips;
}

/**
 * The window chips one day offers. A short stretch is split into rides of the
 * chapter's usual length; a long one is offered whole, by its part of the day,
 * and is trimmed to start no sooner than the lead time allows.
 */
export function windowsOnDate(
  hours: OperatingHours,
  date: string,
  policy: BookingPolicy,
  timeZone: string,
  now: Date,
): BookingWindow[] {
  if (isClosedOn(hours, date)) return [];
  const earliest = earliestStart(policy, now);
  const latest = horizonEnd(policy, timeZone, now);
  const ride = Math.max(CLOCK_STEP_MINUTES, policy.rideMinutes);

  return rangesOn(hours, date).flatMap((range) =>
    chipsOf(range, ride).flatMap((chip) => {
      let from = chip.from;
      if (instantOn(date, from, timeZone) < earliest) {
        if (!chip.long) return [];
        const sameDay = dayKey(earliest, timeZone) === date;
        if (!sameDay) return [];
        from = ceilToStep(clockMinutes(earliest, timeZone));
        if (chip.to - from < ride) return [];
      }
      const to = Math.min(chip.to, from + MAX_WINDOW_MINUTES);
      const startsAt = instantOn(date, from, timeZone);
      const endsAt = instantOn(date, to, timeZone);
      if (startsAt < earliest || startsAt >= latest) return [];
      if (
        endsAt.getTime() - startsAt.getTime() <
        CLOCK_STEP_MINUTES * MINUTE_MS
      )
        return [];
      return [
        {
          date,
          startMinute: from,
          endMinute: to,
          part: chip.long ? partOfDay(chip.from) : null,
          startsAt,
          endsAt,
        },
      ];
    }),
  );
}

/** The days a rider can pick, each with the windows it offers. */
export function bookableDays(
  hours: OperatingHours,
  policy: BookingPolicy,
  timeZone: string,
  now: Date,
): BookingDay[] {
  return bookingDates(policy, timeZone, now).flatMap((date) => {
    const windows = windowsOnDate(hours, date, policy, timeZone, now);
    return windows.length ? [{ date, windows }] : [];
  });
}

const OPEN_DAY_HOURS = (closures: readonly string[]): OperatingHours => ({
  windows: [1, 2, 3, 4, 5, 6, 7].flatMap((weekday) =>
    OPEN_DAY.map((range) => ({
      weekday,
      startMinute: range.from,
      endMinute: range.to,
    })),
  ),
  closures,
});

/**
 * Why the chapter would refuse this window, or `null`. A chapter without
 * riding hours takes requests in the open day the form offers it.
 */
export function bookingRefusal(
  span: Span,
  hours: OperatingHours,
  policy: BookingPolicy,
  timeZone: string,
  now: Date,
): BookingRefusal | null {
  if (span.startsAt < earliestStart(policy, now)) return "leadTime";
  if (span.startsAt >= horizonEnd(policy, timeZone, now))
    return "beyondHorizon";
  if (isClosedOn(hours, dayKey(span.startsAt, timeZone))) return "closedDate";
  const rules = isConfigured(hours) ? hours : OPEN_DAY_HOURS(hours.closures);
  return fitsHours(rules, span, timeZone) === "open" ? null : "outsideHours";
}

export const windowLabel = (
  window: Pick<BookingWindow, "startsAt" | "endsAt">,
  locale: Locale,
  timeZone: string,
) => formatTimeRange(window.startsAt, window.endsAt, locale, timeZone);
