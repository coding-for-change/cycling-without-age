import { addDays, dayKey, instantAt, startOfWeek } from "@/lib/calendar";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The week a calendar page is showing, as `?week=YYYY-MM-DD`.
 *
 * Keeping it in the URL is what lets the calendar stay a Server Component: the
 * week changes by navigation, so no grid, no date library and no client state
 * ship to the browser, and a shared link opens on the same week.
 */
export function readWeekAnchor(
  param: string | string[] | undefined,
  timeZone: string,
  weekStartsOn: number,
  now: Date = new Date(),
): Date {
  const raw = Array.isArray(param) ? param[0] : param;
  const match = raw ? ISO_DATE.exec(raw) : null;
  if (!match) return startOfWeek(now, timeZone, weekStartsOn);

  const [, year, month, day] = match;
  const noon = instantAt(
    {
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: 12,
      minute: 0,
    },
    timeZone,
  );
  // `Date.UTC` rolls 2026-02-31 forward to 2026-03-03 rather than rejecting it,
  // so a date that does not exist can only be spotted by reading it back. Noon
  // keeps the check clear of any hour a zone skips.
  return dayKey(noon, timeZone) === raw
    ? startOfWeek(noon, timeZone, weekStartsOn)
    : startOfWeek(now, timeZone, weekStartsOn);
}

/** The param value that reopens this week. */
export const weekParam = (anchor: Date, timeZone: string) =>
  dayKey(anchor, timeZone);

export function weekNeighbours(anchor: Date, timeZone: string) {
  return {
    previous: weekParam(addDays(anchor, -7, timeZone), timeZone),
    next: weekParam(addDays(anchor, 7, timeZone), timeZone),
  };
}

/** Merges the week into whatever scope query the page is already carrying. */
export function weekHref(
  pathname: string,
  scopeQuery: string,
  week: string,
): string {
  const params = new URLSearchParams(scopeQuery.replace(/^\?/, ""));
  params.set("week", week);
  return `${pathname}?${params.toString()}`;
}
