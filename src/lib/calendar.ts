/**
 * Calendar geometry, in the chapter's zone.
 *
 * Rides are stored as instants. Which day column a ride belongs in, and how far
 * down the column it starts, are questions about the *chapter's* wall clock —
 * not the server's (UTC) and not the reader's. Everything here therefore takes
 * an IANA zone explicitly, the same discipline `@/lib/format` applies to
 * display.
 *
 * No date library: `Intl` already carries the tz database, and the two
 * conversions below are the whole of what a week grid needs.
 */

export type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    // `hour12: false` is forbidden for display — the locale decides that — but
    // this formatter is parsed, never read, so 24h is the correct choice.
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The wall clock this instant shows in `timeZone`. */
export function wallClock(instant: Date, timeZone: string): WallClock {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Midnight comes back as hour 24 in some ICU versions; 24:00 is 00:00.
  const hour = read("hour") % 24;
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour,
    minute: read("minute"),
  };
}

/** Minutes this zone is ahead of UTC at a given instant. */
function offsetMinutes(instant: Date, timeZone: string): number {
  const wall = wallClock(instant, timeZone);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    instant.getUTCSeconds(),
    instant.getUTCMilliseconds(),
  );
  return (asUtc - instant.getTime()) / 60_000;
}

/**
 * The instant at which `timeZone` shows this wall clock.
 *
 * Two passes: the first guess uses UTC's offset, the second corrects with the
 * offset actually in force there — which is what makes the day after a DST
 * switch land on the right hour. In the hour a zone skips forward this returns
 * the instant just after the jump; in the hour it repeats, the earlier of the
 * two. Both are the conventional readings.
 */
export function instantAt(wall: WallClock, timeZone: string): Date {
  const naive = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );
  const firstGuess = new Date(
    naive - offsetMinutes(new Date(naive), timeZone) * 60_000,
  );
  return new Date(naive - offsetMinutes(firstGuess, timeZone) * 60_000);
}

/** Midnight that starts this instant's day, in `timeZone`. */
export function startOfDay(instant: Date, timeZone: string): Date {
  const { year, month, day } = wallClock(instant, timeZone);
  return instantAt({ year, month, day, hour: 0, minute: 0 }, timeZone);
}

export function addDays(instant: Date, days: number, timeZone: string): Date {
  const { year, month, day, hour, minute } = wallClock(instant, timeZone);
  // Day arithmetic on the wall clock, not on milliseconds: a DST day is 23 or
  // 25 hours long and "tomorrow at 10:00" must stay 10:00 across it.
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return instantAt(
    {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour,
      minute,
    },
    timeZone,
  );
}

/** 0 = Sunday … 6 = Saturday, as the chapter's zone sees this instant. */
export function weekday(instant: Date, timeZone: string): number {
  const { year, month, day } = wallClock(instant, timeZone);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Midnight starting the week containing `instant`. `weekStartsOn` is the
 * locale's own first day — Monday across Europe, Sunday in the US — and is
 * resolved by the caller, never pinned here.
 */
export function startOfWeek(
  instant: Date,
  timeZone: string,
  weekStartsOn: number,
): Date {
  const midnight = startOfDay(instant, timeZone);
  const shift = (weekday(midnight, timeZone) - weekStartsOn + 7) % 7;
  return shift
    ? startOfDay(addDays(midnight, -shift, timeZone), timeZone)
    : midnight;
}

/** The seven midnights of that week, in order. */
export function weekDays(
  instant: Date,
  timeZone: string,
  weekStartsOn: number,
): Date[] {
  const start = startOfWeek(instant, timeZone, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) =>
    i === 0 ? start : startOfDay(addDays(start, i, timeZone), timeZone),
  );
}

/** Minutes from that day's midnight, in `timeZone`. Can exceed 1440. */
export function minutesFromMidnight(instant: Date, dayStart: Date): number {
  return Math.round((instant.getTime() - dayStart.getTime()) / 60_000);
}

export type Span = { startsAt: Date; endsAt: Date };

/** Half-open overlap: touching at an edge is not overlapping. */
export const overlaps = (a: Span, b: Span) =>
  a.startsAt < b.endsAt && a.endsAt > b.startsAt;

/**
 * Packs overlapping spans into columns so none is drawn on top of another.
 * Returns, per input index, which lane it takes and how many lanes its cluster
 * needs — the two numbers a `left`/`width` needs.
 */
export function lanes<T extends Span>(
  items: T[],
): { lane: number; lanes: number }[] {
  const order = items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        a.item.startsAt.getTime() - b.item.startsAt.getTime() ||
        b.item.endsAt.getTime() - a.item.endsAt.getTime(),
    );

  const result: { lane: number; lanes: number }[] = items.map(() => ({
    lane: 0,
    lanes: 1,
  }));

  let cluster: { index: number; lane: number }[] = [];
  let clusterEnd = -Infinity;

  const closeCluster = () => {
    const width = cluster.reduce((max, c) => Math.max(max, c.lane + 1), 1);
    for (const { index, lane } of cluster)
      result[index] = { lane, lanes: width };
    cluster = [];
  };

  for (const { item, index } of order) {
    if (item.startsAt.getTime() >= clusterEnd) {
      closeCluster();
      clusterEnd = -Infinity;
    }
    const taken = new Set(
      cluster.filter((c) => overlaps(items[c.index], item)).map((c) => c.lane),
    );
    let lane = 0;
    while (taken.has(lane)) lane += 1;
    cluster.push({ index, lane });
    clusterEnd = Math.max(clusterEnd, item.endsAt.getTime());
  }
  closeCluster();

  return result;
}

/**
 * The calendar date this instant falls on in `timeZone`, as the UTC-midnight
 * Date that `@/lib/format`'s date formatters expect. Bridges an instant (a
 * moment) to a date (a square on a wall calendar) without letting the server's
 * own zone decide which square.
 */
export function calendarDate(instant: Date, timeZone: string): Date {
  const { year, month, day } = wallClock(instant, timeZone);
  return new Date(Date.UTC(year, month - 1, day));
}

/** A stable `YYYY-MM-DD` key for grouping instants by their local day. */
export function dayKey(instant: Date, timeZone: string): string {
  const { year, month, day } = wallClock(instant, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Whether two instants land on the same local day. */
export const sameDay = (a: Date, b: Date, timeZone: string) =>
  dayKey(a, timeZone) === dayKey(b, timeZone);

/**
 * The first day of the week this locale keeps, as 0 = Sunday … 6 = Saturday.
 * `Intl` numbers it 1 = Monday … 7 = Sunday, so Sunday folds back to 0.
 * Monday is the fallback: it is what most of CWA's markets use, and it is what
 * ISO 8601 defines.
 */
export function firstDayOfWeek(locale: string): number {
  type WithWeekInfo = Intl.Locale & {
    getWeekInfo?: () => { firstDay: number };
    weekInfo?: { firstDay: number };
  };
  try {
    const resolved = new Intl.Locale(locale) as WithWeekInfo;
    const info = resolved.getWeekInfo?.() ?? resolved.weekInfo;
    return info ? info.firstDay % 7 : 1;
  } catch {
    return 1;
  }
}
