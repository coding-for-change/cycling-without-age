import { wallClock } from "@/lib/calendar";
import {
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
