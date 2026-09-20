import {
  addDays,
  calendarDate,
  clockMinutes,
  dayKey,
  daySegment,
  daysTouched,
  firstDayOfWeek,
  instantAt,
  lanes,
  minutesFromMidnight,
  overlaps,
  MINUTES_IN_DAY,
  nextDay,
  sameDay,
  startOfDay,
  startOfWeek,
  wallClock,
  weekDays,
  weekday,
} from "./calendar";

const BERLIN = "Europe/Berlin";
const DENVER = "America/Denver";
const KATHMANDU = "Asia/Kathmandu"; // UTC+05:45 — catches minute-offset bugs

describe("wallClock", () => {
  it("reads an instant in the chapter's zone, not the server's", () => {
    // 08:00 UTC is 10:00 in Berlin during CEST
    expect(wallClock(new Date("2026-09-08T08:00:00Z"), BERLIN)).toEqual({
      year: 2026,
      month: 9,
      day: 8,
      hour: 10,
      minute: 0,
    });
  });

  it("reports midnight as hour 0, never 24", () => {
    expect(wallClock(new Date("2026-09-07T22:00:00Z"), BERLIN).hour).toBe(0);
  });

  it("handles a 45-minute offset", () => {
    expect(wallClock(new Date("2026-09-08T00:00:00Z"), KATHMANDU)).toEqual({
      year: 2026,
      month: 9,
      day: 8,
      hour: 5,
      minute: 45,
    });
  });

  it("crosses the date line backwards", () => {
    // 02:00 UTC on the 8th is still the 7th in Denver
    expect(wallClock(new Date("2026-09-08T02:00:00Z"), DENVER)).toMatchObject({
      day: 7,
      hour: 20,
    });
  });
});

describe("instantAt", () => {
  it("round-trips with wallClock", () => {
    for (const zone of [BERLIN, DENVER, KATHMANDU, "UTC"]) {
      for (const iso of [
        "2026-01-15T12:00:00Z",
        "2026-07-15T12:00:00Z",
        "2026-09-08T08:00:00Z",
      ]) {
        const instant = new Date(iso);
        expect(instantAt(wallClock(instant, zone), zone).toISOString()).toBe(
          instant.toISOString(),
        );
      }
    }
  });

  it("resolves 10:00 to the right instant on both sides of a DST switch", () => {
    // CEST (UTC+2) before 25 Oct 2026, CET (UTC+1) after
    const summer = instantAt(
      { year: 2026, month: 10, day: 24, hour: 10, minute: 0 },
      BERLIN,
    );
    const winter = instantAt(
      { year: 2026, month: 10, day: 26, hour: 10, minute: 0 },
      BERLIN,
    );
    expect(summer.toISOString()).toBe("2026-10-24T08:00:00.000Z");
    expect(winter.toISOString()).toBe("2026-10-26T09:00:00.000Z");
  });

  it("picks the post-jump instant for a wall clock the zone skips", () => {
    // Berlin jumps 02:00 → 03:00 on 29 March 2026; 02:30 never happens.
    const skipped = instantAt(
      { year: 2026, month: 3, day: 29, hour: 2, minute: 30 },
      BERLIN,
    );
    expect(wallClock(skipped, BERLIN).hour).toBe(3);
  });
});

describe("startOfDay", () => {
  it("is local midnight, not UTC midnight", () => {
    const midnight = startOfDay(new Date("2026-09-08T15:00:00Z"), BERLIN);
    expect(midnight.toISOString()).toBe("2026-09-07T22:00:00.000Z");
    expect(wallClock(midnight, BERLIN)).toMatchObject({ day: 8, hour: 0 });
  });

  it("is idempotent", () => {
    const once = startOfDay(new Date("2026-09-08T15:00:00Z"), DENVER);
    expect(startOfDay(once, DENVER).toISOString()).toBe(once.toISOString());
  });
});

describe("addDays", () => {
  it("keeps the wall-clock hour across a 23-hour day", () => {
    const before = instantAt(
      { year: 2026, month: 3, day: 28, hour: 10, minute: 0 },
      BERLIN,
    );
    const after = addDays(before, 1, BERLIN);
    expect(wallClock(after, BERLIN)).toMatchObject({ day: 29, hour: 10 });
    // 23 hours of real time, not 24
    expect(after.getTime() - before.getTime()).toBe(23 * 60 * 60_000);
  });

  it("keeps the wall-clock hour across a 25-hour day", () => {
    const before = instantAt(
      { year: 2026, month: 10, day: 24, hour: 10, minute: 0 },
      BERLIN,
    );
    const after = addDays(before, 1, BERLIN);
    expect(wallClock(after, BERLIN)).toMatchObject({ day: 25, hour: 10 });
    expect(after.getTime() - before.getTime()).toBe(25 * 60 * 60_000);
  });

  it("rolls over a month boundary", () => {
    const end = addDays(new Date("2026-09-30T10:00:00Z"), 1, BERLIN);
    expect(wallClock(end, BERLIN)).toMatchObject({ month: 10, day: 1 });
  });

  it("steps backwards", () => {
    const back = addDays(new Date("2026-09-01T10:00:00Z"), -1, BERLIN);
    expect(wallClock(back, BERLIN)).toMatchObject({ month: 8, day: 31 });
  });
});

describe("weekday and startOfWeek", () => {
  it("reads the weekday in the chapter's zone", () => {
    // 22:30 UTC Sunday is already Monday in Berlin
    expect(weekday(new Date("2026-09-06T22:30:00Z"), BERLIN)).toBe(1);
    expect(weekday(new Date("2026-09-06T22:30:00Z"), "UTC")).toBe(0);
  });

  it("starts the week on the locale's own first day", () => {
    const wednesday = new Date("2026-09-09T12:00:00Z");
    const monday = startOfWeek(wednesday, BERLIN, 1);
    const sunday = startOfWeek(wednesday, BERLIN, 0);
    expect(wallClock(monday, BERLIN)).toMatchObject({ day: 7, hour: 0 });
    expect(wallClock(sunday, BERLIN)).toMatchObject({ day: 6, hour: 0 });
  });

  it("returns the day itself when it already is the first day", () => {
    const monday = startOfWeek(new Date("2026-09-09T12:00:00Z"), BERLIN, 1);
    expect(startOfWeek(monday, BERLIN, 1).toISOString()).toBe(
      monday.toISOString(),
    );
  });

  it("gives seven consecutive midnights", () => {
    const days = weekDays(new Date("2026-10-28T12:00:00Z"), BERLIN, 1);
    expect(days).toHaveLength(7);
    expect(days.map((d) => wallClock(d, BERLIN).day)).toEqual([
      26, 27, 28, 29, 30, 31, 1,
    ]);
    for (const day of days) expect(wallClock(day, BERLIN).hour).toBe(0);
  });

  it("spans a DST switch without losing or repeating a day", () => {
    const days = weekDays(new Date("2026-10-25T12:00:00Z"), BERLIN, 1);
    expect(days.map((d) => wallClock(d, BERLIN).day)).toEqual([
      19, 20, 21, 22, 23, 24, 25,
    ]);
  });
});

describe("minutesFromMidnight", () => {
  it("positions a ride inside its day", () => {
    const day = startOfDay(new Date("2026-09-08T12:00:00Z"), BERLIN);
    expect(minutesFromMidnight(new Date("2026-09-08T08:00:00Z"), day)).toBe(
      600,
    );
  });

  it("measures real elapsed minutes across a DST switch", () => {
    const day = startOfDay(new Date("2026-10-25T12:00:00Z"), BERLIN);
    // 10:00 wall clock on a 25-hour day is 11 real hours after midnight
    const tenAm = instantAt(
      { year: 2026, month: 10, day: 25, hour: 10, minute: 0 },
      BERLIN,
    );
    expect(minutesFromMidnight(tenAm, day)).toBe(11 * 60);
  });
});

describe("overlaps", () => {
  const span = (from: string, to: string) => ({
    startsAt: new Date(from),
    endsAt: new Date(to),
  });

  it("is false when spans only touch", () => {
    expect(
      overlaps(
        span("2026-09-08T10:00:00Z", "2026-09-08T11:00:00Z"),
        span("2026-09-08T11:00:00Z", "2026-09-08T12:00:00Z"),
      ),
    ).toBe(false);
  });

  it("is true when one contains the other", () => {
    expect(
      overlaps(
        span("2026-09-08T10:00:00Z", "2026-09-08T14:00:00Z"),
        span("2026-09-08T11:00:00Z", "2026-09-08T12:00:00Z"),
      ),
    ).toBe(true);
  });
});

describe("lanes", () => {
  const span = (from: string, to: string) => ({
    startsAt: new Date(from),
    endsAt: new Date(to),
  });

  it("gives a lone span the full width", () => {
    expect(
      lanes([span("2026-09-08T10:00:00Z", "2026-09-08T11:00:00Z")]),
    ).toEqual([{ lane: 0, lanes: 1 }]);
  });

  it("splits two overlapping spans into two lanes", () => {
    const packed = lanes([
      span("2026-09-08T10:00:00Z", "2026-09-08T12:00:00Z"),
      span("2026-09-08T11:00:00Z", "2026-09-08T13:00:00Z"),
    ]);
    expect(packed.map((p) => p.lanes)).toEqual([2, 2]);
    expect(new Set(packed.map((p) => p.lane))).toEqual(new Set([0, 1]));
  });

  it("keeps sequential spans in one lane", () => {
    const packed = lanes([
      span("2026-09-08T10:00:00Z", "2026-09-08T11:00:00Z"),
      span("2026-09-08T11:00:00Z", "2026-09-08T12:00:00Z"),
    ]);
    expect(packed).toEqual([
      { lane: 0, lanes: 1 },
      { lane: 0, lanes: 1 },
    ]);
  });

  it("reuses a freed lane inside one cluster", () => {
    // A spans the morning; B and C sit inside it back to back, so both take lane 1.
    const packed = lanes([
      span("2026-09-08T09:00:00Z", "2026-09-08T13:00:00Z"),
      span("2026-09-08T09:30:00Z", "2026-09-08T10:30:00Z"),
      span("2026-09-08T11:00:00Z", "2026-09-08T12:00:00Z"),
    ]);
    expect(packed.map((p) => p.lanes)).toEqual([2, 2, 2]);
    expect(packed[1].lane).toBe(1);
    expect(packed[2].lane).toBe(1);
  });

  it("returns results in input order, not sorted order", () => {
    const packed = lanes([
      span("2026-09-08T14:00:00Z", "2026-09-08T15:00:00Z"),
      span("2026-09-08T09:00:00Z", "2026-09-08T10:00:00Z"),
    ]);
    expect(packed).toHaveLength(2);
    expect(packed.every((p) => p.lanes === 1)).toBe(true);
  });

  it("handles an empty list", () => {
    expect(lanes([])).toEqual([]);
  });
});

describe("calendarDate and dayKey", () => {
  it("maps an instant to the local square on the wall calendar", () => {
    // 22:30 UTC on the 7th is already the 8th in Berlin
    const instant = new Date("2026-09-07T22:30:00Z");
    expect(calendarDate(instant, BERLIN).toISOString()).toBe(
      "2026-09-08T00:00:00.000Z",
    );
    expect(dayKey(instant, BERLIN)).toBe("2026-09-08");
    expect(dayKey(instant, "UTC")).toBe("2026-09-07");
  });

  it("pads single-digit months and days", () => {
    expect(dayKey(new Date("2026-01-05T12:00:00Z"), BERLIN)).toBe("2026-01-05");
  });

  it("groups two instants on the same local day", () => {
    expect(
      sameDay(
        new Date("2026-09-08T06:00:00Z"),
        new Date("2026-09-08T20:00:00Z"),
        BERLIN,
      ),
    ).toBe(true);
    // …and separates them once local midnight is crossed
    expect(
      sameDay(
        new Date("2026-09-08T21:00:00Z"),
        new Date("2026-09-08T23:00:00Z"),
        BERLIN,
      ),
    ).toBe(false);
  });
});

describe("firstDayOfWeek", () => {
  it("is Monday across Europe and Sunday in the US", () => {
    expect(firstDayOfWeek("de-DE")).toBe(1);
    expect(firstDayOfWeek("da-DK")).toBe(1);
    expect(firstDayOfWeek("en-GB")).toBe(1);
    expect(firstDayOfWeek("en-US")).toBe(0);
  });

  it("falls back to Monday for a locale it cannot parse", () => {
    expect(firstDayOfWeek("not a locale")).toBe(1);
  });
});

describe("the repeated hour", () => {
  it("resolves by the offset at the naive instant, not always the earlier one", () => {
    // Berlin lands on the second occurrence (CET), Denver on the first (MDT).
    // Documented in `instantAt` — this test is what keeps that honest.
    expect(
      instantAt(
        { year: 2026, month: 10, day: 25, hour: 2, minute: 30 },
        BERLIN,
      ).toISOString(),
    ).toBe("2026-10-25T01:30:00.000Z");
    expect(
      instantAt(
        { year: 2026, month: 11, day: 1, hour: 1, minute: 30 },
        DENVER,
      ).toISOString(),
    ).toBe("2026-11-01T07:30:00.000Z");
  });
});

describe("clockMinutes and daySegment", () => {
  const span = (from: string, to: string) => ({
    startsAt: new Date(from),
    endsAt: new Date(to),
  });

  it("reads the clock face, not elapsed time", () => {
    // The grid's hour rows are wall-clock, so a 25-hour day must not shift a
    // 10:00 ride onto the 11:00 row.
    const tenAm = instantAt(
      { year: 2026, month: 10, day: 25, hour: 10, minute: 0 },
      BERLIN,
    );
    expect(clockMinutes(tenAm, BERLIN)).toBe(600);
    expect(minutesFromMidnight(tenAm, startOfDay(tenAm, BERLIN))).toBe(660);
  });

  it("places a ride inside its own day", () => {
    const start = startOfDay(new Date("2026-09-08T12:00:00Z"), BERLIN);
    const end = nextDay(start, BERLIN);
    expect(
      daySegment(
        span("2026-09-08T08:00:00Z", "2026-09-08T10:00:00Z"),
        start,
        end,
        BERLIN,
      ),
    ).toEqual({ from: 600, to: 720 });
  });

  it("clips a ride that runs past midnight into both days", () => {
    const ride = span("2026-09-08T21:00:00Z", "2026-09-09T00:00:00Z"); // 23:00–02:00 Berlin
    const first = startOfDay(new Date("2026-09-08T12:00:00Z"), BERLIN);
    const second = nextDay(first, BERLIN);

    expect(daySegment(ride, first, second, BERLIN)).toEqual({
      from: 1380,
      to: MINUTES_IN_DAY,
    });
    expect(daySegment(ride, second, nextDay(second, BERLIN), BERLIN)).toEqual({
      from: 0,
      to: 120,
    });
  });

  it("is null for a day the ride never touches", () => {
    const day = startOfDay(new Date("2026-09-10T12:00:00Z"), BERLIN);
    expect(
      daySegment(
        span("2026-09-08T08:00:00Z", "2026-09-08T10:00:00Z"),
        day,
        nextDay(day, BERLIN),
        BERLIN,
      ),
    ).toBeNull();
  });

  it("does not claim a day it only touches at midnight", () => {
    // Half-open: a ride ending exactly at midnight belongs to the day before.
    const ride = span("2026-09-08T18:00:00Z", "2026-09-08T22:00:00Z"); // ends 00:00
    const next = startOfDay(new Date("2026-09-09T12:00:00Z"), BERLIN);
    expect(daySegment(ride, next, nextDay(next, BERLIN), BERLIN)).toBeNull();
  });
});

describe("daysTouched", () => {
  it("lists one day for an ordinary ride", () => {
    expect(
      daysTouched(
        {
          startsAt: new Date("2026-09-08T08:00:00Z"),
          endsAt: new Date("2026-09-08T10:00:00Z"),
        },
        BERLIN,
      ),
    ).toEqual(["2026-09-08"]);
  });

  it("lists both days for one that runs past midnight", () => {
    expect(
      daysTouched(
        {
          startsAt: new Date("2026-09-08T21:00:00Z"),
          endsAt: new Date("2026-09-09T00:00:00Z"),
        },
        BERLIN,
      ),
    ).toEqual(["2026-09-08", "2026-09-09"]);
  });
});
