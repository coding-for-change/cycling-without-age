import {
  gridRange,
  markersByDay,
  monthGrid,
  monthWindow,
  nextBusyDay,
  parseDay,
  parseMonth,
  selectDay,
  shiftMonth,
  type CalendarEntry,
} from "./month-grid";

describe("monthGrid", () => {
  it("lays October 2026 out Monday-first with the edges of its neighbours", () => {
    const weeks = monthGrid("2026-10");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toEqual({ key: "2026-09-28", day: 28, inMonth: false });
    expect(weeks[0][3]).toEqual({ key: "2026-10-01", day: 1, inMonth: true });
    expect(weeks[4][6]).toEqual({ key: "2026-11-01", day: 1, inMonth: false });
    expect(weeks.flat().filter((day) => day.inMonth)).toHaveLength(31);
  });

  it("needs six weeks when the month starts late in the week", () => {
    const weeks = monthGrid("2026-08");
    expect(weeks).toHaveLength(6);
    expect(weeks[0][5].key).toBe("2026-08-01");
    expect(weeks[5][0].key).toBe("2026-08-31");
  });

  it("starts the week on Sunday when asked", () => {
    expect(monthGrid("2026-10", 0)[0][0].key).toBe("2026-09-27");
  });

  it("handles a February that fits in four weeks", () => {
    const weeks = monthGrid("2027-02");
    expect(weeks).toHaveLength(4);
    expect(gridRange("2027-02")).toEqual({
      first: "2027-02-01",
      last: "2027-02-28",
    });
  });
});

describe("month keys", () => {
  it("parses only real months and days", () => {
    expect(parseMonth("2026-10")).toBe("2026-10");
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth("oct")).toBeNull();
    expect(parseDay("2026-02-29")).toBeNull();
    expect(parseDay("2028-02-29")).toBe("2028-02-29");
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("monthWindow", () => {
  it("covers the month plus a week either side on the chapter's clock", () => {
    const { from, to } = monthWindow("2026-10", "Europe/Berlin");
    expect(from.toISOString()).toBe("2026-09-23T22:00:00.000Z");
    expect(to.toISOString()).toBe("2026-11-07T23:00:00.000Z");
  });
});

describe("markersByDay", () => {
  const entry = (
    id: string,
    day: string,
    kind: CalendarEntry["kind"],
    at = 0,
  ): CalendarEntry => ({ id, day, kind, at });

  it("puts own rides first, then joinable things, then requests, capped at three", () => {
    expect(
      markersByDay([
        entry("a", "2026-10-22", "pending", 1),
        entry("b", "2026-10-22", "join", 2),
        entry("c", "2026-10-22", "mine", 3),
        entry("d", "2026-10-22", "mine", 4),
        entry("e", "2026-10-23", "join"),
        { ...entry("f", "2026-10-24", "mine"), muted: true },
      ]),
    ).toEqual({
      "2026-10-22": ["mine", "mine", "join"],
      "2026-10-23": ["join"],
    });
  });
});

describe("day selection", () => {
  it("keeps a requested day inside the month", () => {
    expect(
      selectDay({
        requested: "2026-10-05",
        month: "2026-10",
        today: "2026-10-22",
      }),
    ).toBe("2026-10-05");
  });

  it("falls back to today, then the first of the month", () => {
    expect(
      selectDay({
        requested: "2026-11-05",
        month: "2026-10",
        today: "2026-10-22",
      }),
    ).toBe("2026-10-22");
    expect(
      selectDay({ requested: null, month: "2026-12", today: "2026-10-22" }),
    ).toBe("2026-12-01");
  });

  it("finds the next busy day after today", () => {
    expect(
      nextBusyDay(["2026-10-20", "2026-11-02", "2026-10-24"], "2026-10-22"),
    ).toBe("2026-10-24");
    expect(nextBusyDay(["2026-10-20"], "2026-10-22")).toBeNull();
  });
});
