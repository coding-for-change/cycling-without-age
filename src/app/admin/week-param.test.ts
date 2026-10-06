import { wallClock } from "@/lib/calendar";
import {
  dayNeighbours,
  readDayParam,
  readWeekAnchor,
  weekHref,
  weekNeighbours,
  weekParam,
} from "./week-param";

const BERLIN = "Europe/Berlin";
const MONDAY = 1;
const NOW = new Date("2026-09-13T12:00:00Z"); // a Sunday

describe("readWeekAnchor", () => {
  it("falls back to the current week when the param is absent", () => {
    const anchor = readWeekAnchor(undefined, BERLIN, MONDAY, NOW);
    expect(wallClock(anchor, BERLIN)).toMatchObject({ day: 7, hour: 0 });
  });

  it("reads a week from the URL", () => {
    const anchor = readWeekAnchor("2026-09-23", BERLIN, MONDAY, NOW);
    // Snaps to the Monday of that week
    expect(wallClock(anchor, BERLIN)).toMatchObject({ month: 9, day: 21 });
  });

  it("snaps to the locale's first day rather than trusting the param", () => {
    const sundayStart = readWeekAnchor("2026-09-23", BERLIN, 0, NOW);
    expect(wallClock(sundayStart, BERLIN)).toMatchObject({ day: 20 });
  });

  it("ignores a param that is not a date", () => {
    const anchor = readWeekAnchor("last-tuesday", BERLIN, MONDAY, NOW);
    expect(wallClock(anchor, BERLIN)).toMatchObject({ day: 7 });
  });

  it("takes the first value when the param repeats", () => {
    const anchor = readWeekAnchor(
      ["2026-09-23", "2026-10-01"],
      BERLIN,
      MONDAY,
      NOW,
    );
    expect(wallClock(anchor, BERLIN)).toMatchObject({ month: 9, day: 21 });
  });
});

describe("weekNeighbours", () => {
  it("steps a week either way", () => {
    const anchor = readWeekAnchor("2026-09-07", BERLIN, MONDAY, NOW);
    expect(weekNeighbours(anchor, BERLIN)).toEqual({
      previous: "2026-08-31",
      next: "2026-09-14",
    });
  });

  it("round-trips through the param", () => {
    const anchor = readWeekAnchor("2026-09-07", BERLIN, MONDAY, NOW);
    const back = readWeekAnchor(weekParam(anchor, BERLIN), BERLIN, MONDAY, NOW);
    expect(back.toISOString()).toBe(anchor.toISOString());
  });

  it("steps across a DST switch without skipping a week", () => {
    const anchor = readWeekAnchor("2026-10-26", BERLIN, MONDAY, NOW);
    expect(weekNeighbours(anchor, BERLIN).previous).toBe("2026-10-19");
  });
});

describe("weekHref", () => {
  it("keeps the scope the page is already carrying", () => {
    expect(weekHref("/admin/rides", "?chapter=muenchen", "2026-09-14")).toBe(
      "/admin/rides?chapter=muenchen&week=2026-09-14",
    );
  });

  it("works with no scope query at all", () => {
    expect(weekHref("/admin/rides", "", "2026-09-14")).toBe(
      "/admin/rides?week=2026-09-14",
    );
  });

  it("replaces a week already in the query rather than appending one", () => {
    expect(
      weekHref(
        "/admin/bikes",
        "?chapter=muenchen&week=2026-01-05",
        "2026-09-14",
      ),
    ).toBe("/admin/bikes?chapter=muenchen&week=2026-09-14");
  });
});

describe("dates that pass the pattern but do not exist", () => {
  it("falls back for 31 February rather than showing 3 March", () => {
    // `Date.UTC` rolls the day forward instead of rejecting it, so the only way
    // to catch this is to read the date back.
    const anchor = readWeekAnchor("2026-02-31", BERLIN, MONDAY, NOW);
    expect(wallClock(anchor, BERLIN)).toMatchObject({ month: 9, day: 7 });
  });

  // Each of these matches the `\d{4}-\d{2}-\d{2}` pattern and rolls over to a
  // real date, so only the read-back catches them. Named individually: when
  // this goes red in CI the report should say which input broke it.
  it.each(["2026-13-01", "2026-04-32", "2026-00-10", "2026-02-30"])(
    "falls back for %s",
    (bad) => {
      expect(
        wallClock(readWeekAnchor(bad, BERLIN, MONDAY, NOW), BERLIN),
      ).toMatchObject({ month: 9, day: 7 });
    },
  );

  it("still accepts a real leap day", () => {
    const anchor = readWeekAnchor("2028-02-29", BERLIN, MONDAY, NOW);
    expect(wallClock(anchor, BERLIN)).toMatchObject({ month: 2, day: 28 });
  });
});

describe("readDayParam", () => {
  const days = ["2026-09-07", "2026-09-08", "2026-09-09"];

  it("keeps a day inside the week", () => {
    expect(readDayParam("2026-09-08", days, "2026-09-13")).toBe("2026-09-08");
  });

  it("falls back to today when it is in the week", () => {
    expect(readDayParam("2026-01-01", days, "2026-09-09")).toBe("2026-09-09");
  });

  it("falls back to the first day otherwise", () => {
    expect(readDayParam(undefined, days, "2026-09-13")).toBe("2026-09-07");
  });
});

describe("dayNeighbours", () => {
  it("steps across a week boundary and carries the new week", () => {
    const { previous, next } = dayNeighbours("2026-09-07", BERLIN, MONDAY);
    expect(previous).toEqual({ day: "2026-09-06", week: "2026-08-31" });
    expect(next).toEqual({ day: "2026-09-08", week: "2026-09-07" });
  });

  it("crosses a month", () => {
    expect(dayNeighbours("2026-09-30", BERLIN, MONDAY).next.day).toBe(
      "2026-10-01",
    );
  });
});
