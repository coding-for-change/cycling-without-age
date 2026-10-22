import { countdownOf, dayParts } from "./countdown";

const BERLIN = "Europe/Berlin";

describe("countdownOf", () => {
  it("is today for a ride later the same local day", () => {
    expect(
      countdownOf("2026-10-15T06:00:00Z", "2026-10-15T09:00:00Z", BERLIN),
    ).toEqual({ kind: "today" });
  });

  it("is tomorrow across local midnight even when fewer than 24 hours remain", () => {
    expect(
      countdownOf("2026-10-15T21:00:00Z", "2026-10-16T06:00:00Z", BERLIN),
    ).toEqual({ kind: "tomorrow" });
  });

  it("counts calendar days in the chapter zone, not UTC", () => {
    expect(
      countdownOf("2026-10-15T22:30:00Z", "2026-10-18T08:00:00Z", BERLIN),
    ).toEqual({ kind: "days", days: 2 });
    expect(
      countdownOf("2026-10-15T22:30:00Z", "2026-10-18T08:00:00Z", "UTC"),
    ).toEqual({ kind: "days", days: 3 });
  });

  it("keeps whole days across a daylight-saving change", () => {
    expect(
      countdownOf("2026-10-24T10:00:00Z", "2026-10-26T10:00:00Z", BERLIN),
    ).toEqual({ kind: "days", days: 2 });
  });

  it("is past once the ride's day is behind", () => {
    expect(
      countdownOf("2026-10-16T08:00:00Z", "2026-10-15T09:00:00Z", BERLIN),
    ).toEqual({ kind: "past" });
  });

  it("accepts Date instances", () => {
    expect(
      countdownOf(
        new Date("2026-10-15T08:00:00Z"),
        new Date("2026-10-22T08:00:00Z"),
        BERLIN,
      ),
    ).toEqual({ kind: "days", days: 7 });
  });
});

describe("dayParts", () => {
  it("reads the day in the chapter zone and drops the abbreviation dot", () => {
    expect(dayParts("2026-10-15T22:30:00Z", BERLIN, "de-DE")).toEqual({
      weekday: "Fr",
      day: "16",
      month: "Okt",
    });
    expect(dayParts("2026-10-15T22:30:00Z", "UTC", "en-US")).toEqual({
      weekday: "Thu",
      day: "15",
      month: "Oct",
    });
  });
});
