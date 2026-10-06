import { dayKey } from "@/lib/calendar";
import { resolveReportRange } from "./report-range";
import {
  firstInstantOf,
  reportScope,
  zoneShifts,
  type ZoneShift,
} from "./report-zones";

const from = new Date("2025-10-01T00:00:00Z");
const to = new Date("2026-11-01T00:00:00Z");

const iso = (shifts: ZoneShift[]) =>
  shifts.map((s) => ({
    since: s.since.toISOString(),
    until: s.until.toISOString(),
    minutes: s.minutes,
  }));

const localDayOf = (instant: Date, shifts: ZoneShift[]) => {
  const shift = shifts.find((s) => instant >= s.since && instant < s.until)!;
  return new Date(instant.getTime() + shift.minutes * 60_000)
    .toISOString()
    .slice(0, 10);
};

describe("zoneShifts", () => {
  it("splits Berlin at both daylight saving switches", () => {
    expect(iso(zoneShifts("Europe/Berlin", from, to))).toEqual([
      {
        since: "2025-10-01T00:00:00.000Z",
        until: "2025-10-26T01:00:00.000Z",
        minutes: 120,
      },
      {
        since: "2025-10-26T01:00:00.000Z",
        until: "2026-03-29T01:00:00.000Z",
        minutes: 60,
      },
      {
        since: "2026-03-29T01:00:00.000Z",
        until: "2026-10-25T01:00:00.000Z",
        minutes: 120,
      },
      {
        since: "2026-10-25T01:00:00.000Z",
        until: "2026-11-01T00:00:00.000Z",
        minutes: 60,
      },
    ]);
  });

  it("keeps a zone without daylight saving in one span", () => {
    expect(iso(zoneShifts("Asia/Kolkata", from, to))).toEqual([
      {
        since: from.toISOString(),
        until: to.toISOString(),
        minutes: 330,
      },
    ]);
  });

  it("finds half-hour switches", () => {
    const shifts = zoneShifts("Australia/Adelaide", from, to);
    expect(shifts.map((s) => s.minutes)).toEqual([570, 630, 570, 630]);
    expect(shifts[1].since.toISOString()).toBe("2025-10-04T16:30:00.000Z");
  });

  it.each([
    "Europe/Berlin",
    "America/Los_Angeles",
    "America/Santiago",
    "Australia/Adelaide",
    "Asia/Kathmandu",
    "Pacific/Chatham",
  ])("gives the same local day as the calendar in %s", (timeZone) => {
    const shifts = zoneShifts(timeZone, from, to);
    for (let t = from.getTime(); t < to.getTime(); t += 37 * 60_000) {
      const instant = new Date(t);
      expect(localDayOf(instant, shifts)).toBe(dayKey(instant, timeZone));
    }
  });

  it("puts a late evening ride in Munich on the next local day", () => {
    const shifts = zoneShifts("Europe/Berlin", from, to);
    expect(localDayOf(new Date("2026-06-30T22:30:00Z"), shifts)).toBe(
      "2026-07-01",
    );
  });
});

describe("firstInstantOf", () => {
  it("finds local midnight across a DST change", () => {
    const shifts = zoneShifts("Europe/Berlin", from, to);
    expect(firstInstantOf("2026-03-29", shifts).toISOString()).toBe(
      "2026-03-28T23:00:00.000Z",
    );
    expect(firstInstantOf("2026-03-30", shifts).toISOString()).toBe(
      "2026-03-29T22:00:00.000Z",
    );
  });

  it.each(["America/Santiago", "America/New_York", "Asia/Singapore"])(
    "is the first instant of that day in %s",
    (timeZone) => {
      const shifts = zoneShifts(timeZone, from, to);
      for (const date of [
        "2025-11-02",
        "2026-03-08",
        "2026-04-05",
        "2026-09-06",
      ]) {
        const first = firstInstantOf(date, shifts);
        expect(dayKey(first, timeZone)).toBe(date);
        expect(dayKey(new Date(first.getTime() - 1), timeZone) < date).toBe(
          true,
        );
      }
    },
  );
});

describe("reportScope", () => {
  const range = resolveReportRange({ range: "7d" }, { today: "2026-10-04" });
  const scope = reportScope(
    [
      { id: "muc", timeZone: "Europe/Berlin" },
      { id: "nyc", timeZone: "America/New_York" },
      { id: "ham", timeZone: "Europe/Berlin" },
    ],
    range,
    new Date("2026-10-04T12:00:00Z"),
  );

  it("shares one zone between chapters on the same clock", () => {
    expect(scope.chapterZones.map((c) => [c.chapterId, c.zone])).toEqual([
      ["muc", 0],
      ["nyc", 1],
      ["ham", 0],
    ]);
    expect(scope.zoneShifts).toHaveLength(2);
  });

  it("starts each period at the chapter's own midnight", () => {
    const nyc = scope.chapterZones.find((c) => c.chapterId === "nyc")!;
    expect(nyc.firstInstant.current.toISOString()).toBe(
      "2026-09-28T04:00:00.000Z",
    );
    expect(nyc.firstInstant.previous.toISOString()).toBe(
      "2026-09-21T04:00:00.000Z",
    );
  });

  it("covers both padded periods", () => {
    expect(scope.windows.current.from.toISOString()).toBe(
      "2026-09-27T10:00:00.000Z",
    );
    expect(scope.windows.previous.to.toISOString()).toBe(
      "2026-09-28T14:00:00.000Z",
    );
    expect(scope.zoneShifts[0][0].since).toEqual(scope.windows.previous.from);
    expect(scope.zoneShifts[0].at(-1)!.until).toEqual(scope.windows.current.to);
  });
});
