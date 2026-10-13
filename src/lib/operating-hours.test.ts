import { instantAt, MINUTES_IN_DAY } from "./calendar";
import {
  closedRanges,
  fitsHours,
  isoWeekday,
  NO_HOURS,
  openingBand,
  windowsOn,
  type OperatingHours,
} from "./operating-hours";

const BERLIN = "Europe/Berlin";
const DENVER = "America/Denver";

const HOURS: OperatingHours = {
  windows: [
    { weekday: 2, startMinute: 9 * 60, endMinute: 12 * 60 },
    { weekday: 2, startMinute: 14 * 60, endMinute: 17 * 60 },
    { weekday: 7, startMinute: 10 * 60, endMinute: 16 * 60 },
  ],
  closures: ["2026-10-20"],
};

const at = (date: string, hour: number, minute = 0, zone = BERLIN) => {
  const [year, month, day] = date.split("-").map(Number);
  return instantAt({ year, month, day, hour, minute }, zone);
};

const span = (date: string, from: number, to: number, zone = BERLIN) => ({
  startsAt: at(date, Math.floor(from / 60), from % 60, zone),
  endsAt: at(date, Math.floor(to / 60), to % 60, zone),
});

describe("isoWeekday", () => {
  it("numbers Monday 1 and Sunday 7", () => {
    expect(isoWeekday("2026-10-12")).toBe(1);
    expect(isoWeekday("2026-10-18")).toBe(7);
  });
});

describe("windowsOn", () => {
  it("returns the weekday's windows in order", () => {
    expect(windowsOn(HOURS, "2026-10-13")).toEqual([
      { from: 540, to: 720 },
      { from: 840, to: 1020 },
    ]);
  });

  it("returns nothing on a closed date or a day without windows", () => {
    expect(windowsOn(HOURS, "2026-10-20")).toEqual([]);
    expect(windowsOn(HOURS, "2026-10-14")).toEqual([]);
  });
});

describe("fitsHours", () => {
  it("accepts a ride inside one window", () => {
    expect(fitsHours(HOURS, span("2026-10-13", 600, 690), BERLIN)).toBe("open");
  });

  it("accepts a ride that ends exactly when the window closes", () => {
    expect(fitsHours(HOURS, span("2026-10-13", 660, 720), BERLIN)).toBe("open");
  });

  it("flags a ride that runs past the window or across the lunch gap", () => {
    expect(fitsHours(HOURS, span("2026-10-13", 690, 750), BERLIN)).toBe(
      "outsideHours",
    );
    expect(fitsHours(HOURS, span("2026-10-13", 600, 900), BERLIN)).toBe(
      "outsideHours",
    );
  });

  it("calls a day without windows or with a closure closed", () => {
    expect(fitsHours(HOURS, span("2026-10-14", 600, 660), BERLIN)).toBe(
      "closed",
    );
    expect(fitsHours(HOURS, span("2026-10-20", 600, 660), BERLIN)).toBe(
      "closed",
    );
  });

  it("says unconfigured when the chapter set no hours", () => {
    expect(fitsHours(NO_HOURS, span("2026-10-14", 600, 660), BERLIN)).toBe(
      "unconfigured",
    );
  });

  it("reads the day in the chapter's zone", () => {
    const lateMondayInDenver = span(
      "2026-10-12",
      23 * 60,
      23 * 60 + 30,
      DENVER,
    );
    expect(fitsHours(HOURS, lateMondayInDenver, DENVER)).toBe("closed");
    expect(fitsHours(HOURS, lateMondayInDenver, BERLIN)).toBe("outsideHours");
  });

  it("measures a ride on the DST day in wall-clock minutes", () => {
    expect(fitsHours(HOURS, span("2026-03-29", 600, 960), BERLIN)).toBe("open");
    expect(fitsHours(HOURS, span("2026-10-25", 600, 960), BERLIN)).toBe("open");
  });
});

describe("closedRanges", () => {
  it("shades everything outside the windows", () => {
    expect(closedRanges(HOURS, "2026-10-13")).toEqual([
      { from: 0, to: 540 },
      { from: 720, to: 840 },
      { from: 1020, to: MINUTES_IN_DAY },
    ]);
  });

  it("shades the whole day on a closure or a day without windows", () => {
    expect(closedRanges(HOURS, "2026-10-20")).toEqual([
      { from: 0, to: MINUTES_IN_DAY },
    ]);
    expect(closedRanges(HOURS, "2026-10-14")).toEqual([
      { from: 0, to: MINUTES_IN_DAY },
    ]);
  });

  it("shades nothing when no hours are set", () => {
    expect(closedRanges(NO_HOURS, "2026-10-14")).toEqual([]);
  });
});

describe("openingBand", () => {
  it("spans the earliest opening to the latest closing", () => {
    expect(openingBand(HOURS)).toEqual({ from: 540, to: 1020 });
    expect(openingBand(NO_HOURS)).toBeNull();
  });
});
