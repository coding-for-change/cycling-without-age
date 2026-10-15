import {
  bookableDays,
  bookingDates,
  bookingRefusal,
  horizonEnd,
  instantOn,
  windowLabel,
  windowsOnDate,
  type BookingPolicy,
} from "./booking-windows";
import type { OperatingHours } from "./operating-hours";

const BERLIN = "Europe/Berlin";
const DENVER = "America/Denver";

const POLICY: BookingPolicy = {
  leadTimeHours: 48,
  horizonDays: 14,
  rideMinutes: 60,
};

const weekdays = (from: number, to: number) =>
  [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
    weekday,
    startMinute: from * 60,
    endMinute: to * 60,
  }));

const MORNINGS: OperatingHours = { windows: weekdays(10, 12), closures: [] };
const LONG_DAYS: OperatingHours = { windows: weekdays(9, 17), closures: [] };

const clock = (window: { startMinute: number; endMinute: number }) =>
  `${window.startMinute / 60}-${window.endMinute / 60}`;

describe("windowsOnDate", () => {
  const now = new Date("2026-10-05T08:00:00Z");

  it("splits a short stretch into rides of the chapter's usual length", () => {
    const windows = windowsOnDate(MORNINGS, "2026-10-08", POLICY, BERLIN, now);
    expect(windows.map(clock)).toEqual(["10-11", "11-12"]);
    expect(windows.every((window) => window.part === null)).toBe(true);
    expect(windows[0].startsAt.toISOString()).toBe("2026-10-08T08:00:00.000Z");
  });

  it("offers a long stretch whole, by its part of the day", () => {
    const [window] = windowsOnDate(
      LONG_DAYS,
      "2026-10-08",
      POLICY,
      BERLIN,
      now,
    );
    expect(clock(window)).toBe("9-17");
    expect(window.part).toBe("morning");
  });

  it("never offers a window longer than a ride can be", () => {
    const longDays: OperatingHours = {
      windows: weekdays(7, 21),
      closures: [],
    };
    const [window] = windowsOnDate(longDays, "2026-10-08", POLICY, BERLIN, now);
    expect(window.endMinute - window.startMinute).toBe(12 * 60);
  });

  it("offers nothing on a closure", () => {
    expect(
      windowsOnDate(
        { ...MORNINGS, closures: ["2026-10-08"] },
        "2026-10-08",
        POLICY,
        BERLIN,
        now,
      ),
    ).toEqual([]);
  });

  it("offers the open day when the chapter never set hours", () => {
    expect(
      windowsOnDate(
        { windows: [], closures: [] },
        "2026-10-08",
        POLICY,
        BERLIN,
        now,
      ).map(clock),
    ).toEqual(["9-10", "10-11", "11-12", "13-17"]);
  });

  describe("the lead-time boundary", () => {
    const boundary = new Date("2026-10-06T08:00:00Z");

    it("keeps a slot starting exactly at the boundary", () => {
      const windows = windowsOnDate(
        MORNINGS,
        "2026-10-08",
        POLICY,
        BERLIN,
        boundary,
      );
      expect(windows.map(clock)).toEqual(["10-11", "11-12"]);
    });

    it("drops a slot starting a minute before it", () => {
      const windows = windowsOnDate(
        MORNINGS,
        "2026-10-08",
        POLICY,
        BERLIN,
        new Date(boundary.getTime() + 60_000),
      );
      expect(windows.map(clock)).toEqual(["11-12"]);
    });

    it("trims a long stretch to the next quarter hour after it", () => {
      const [window] = windowsOnDate(
        LONG_DAYS,
        "2026-10-08",
        POLICY,
        BERLIN,
        new Date("2026-10-06T08:05:00Z"),
      );
      expect(window.startMinute).toBe(10 * 60 + 15);
      expect(window.endMinute).toBe(17 * 60);
    });
  });

  describe("across DST", () => {
    it("keeps the wall clock on the day Berlin falls back", () => {
      const [first] = windowsOnDate(
        MORNINGS,
        "2026-10-25",
        POLICY,
        BERLIN,
        new Date("2026-10-20T08:00:00Z"),
      );
      expect(first.startsAt.toISOString()).toBe("2026-10-25T09:00:00.000Z");
      expect(first.endsAt.toISOString()).toBe("2026-10-25T10:00:00.000Z");
    });

    it("keeps the wall clock on the day Berlin springs forward", () => {
      const [first] = windowsOnDate(
        MORNINGS,
        "2026-03-29",
        POLICY,
        BERLIN,
        new Date("2026-03-20T08:00:00Z"),
      );
      expect(first.startsAt.toISOString()).toBe("2026-03-29T08:00:00.000Z");
    });

    it("never offers a window that does not exist on the spring-forward day", () => {
      const nights: OperatingHours = {
        windows: weekdays(1, 4),
        closures: [],
      };
      const windows = windowsOnDate(
        nights,
        "2026-03-29",
        POLICY,
        BERLIN,
        new Date("2026-03-20T08:00:00Z"),
      );
      expect(windows.length).toBeGreaterThan(0);
      for (const window of windows)
        expect(window.endsAt.getTime()).toBeGreaterThan(
          window.startsAt.getTime(),
        );
      expect(windows.map(clock)).not.toContain("2-3");
    });

    it("trims a long stretch on the wall clock across the spring-forward night", () => {
      const sundays: OperatingHours = {
        windows: [{ weekday: 7, startMinute: 13 * 60, endMinute: 17 * 60 }],
        closures: [],
      };
      const [window] = windowsOnDate(
        sundays,
        "2027-03-28",
        { ...POLICY, leadTimeHours: 24 },
        BERLIN,
        new Date("2027-03-27T13:07:00Z"),
      );
      expect(clock(window)).toBe(`${(15 * 60 + 15) / 60}-17`);
      expect(window.startsAt.toISOString()).toBe("2027-03-28T13:15:00.000Z");
    });

    it("trims a long stretch on the wall clock across the fall-back night", () => {
      const sundays: OperatingHours = {
        windows: [{ weekday: 7, startMinute: 13 * 60, endMinute: 17 * 60 }],
        closures: [],
      };
      const [window] = windowsOnDate(
        sundays,
        "2026-10-25",
        { ...POLICY, leadTimeHours: 24 },
        BERLIN,
        new Date("2026-10-24T12:07:00Z"),
      );
      expect(window.startMinute).toBe(13 * 60 + 15);
      expect(window.startsAt.toISOString()).toBe("2026-10-25T12:15:00.000Z");
    });

    it("reads Denver's own clock, not Berlin's", () => {
      const [first] = windowsOnDate(
        MORNINGS,
        "2026-11-01",
        POLICY,
        DENVER,
        new Date("2026-10-25T08:00:00Z"),
      );
      expect(first.startsAt.toISOString()).toBe("2026-11-01T17:00:00.000Z");
    });
  });
});

describe("bookingDates and the horizon", () => {
  it("runs from today to the last day the horizon reaches", () => {
    const dates = bookingDates(
      { ...POLICY, horizonDays: 3 },
      BERLIN,
      new Date("2026-10-05T23:30:00Z"),
    );
    expect(dates).toEqual([
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
    ]);
  });

  it("ends at local midnight across a DST change", () => {
    expect(
      horizonEnd(
        POLICY,
        BERLIN,
        new Date("2026-10-20T08:00:00Z"),
      ).toISOString(),
    ).toBe("2026-11-03T23:00:00.000Z");
  });

  it("accepts a ride ending at the horizon and refuses one starting there", () => {
    const now = new Date("2026-10-05T08:00:00Z");
    const policy = { ...POLICY, leadTimeHours: 0, horizonDays: 3 };
    const end = horizonEnd(policy, BERLIN, now);
    const allDay: OperatingHours = { windows: weekdays(0, 24), closures: [] };
    const quarter = 15 * 60_000;
    expect(
      bookingRefusal(
        { startsAt: new Date(end.getTime() - quarter), endsAt: end },
        allDay,
        policy,
        BERLIN,
        now,
      ),
    ).toBeNull();
    expect(
      bookingRefusal(
        { startsAt: end, endsAt: new Date(end.getTime() + quarter) },
        allDay,
        policy,
        BERLIN,
        now,
      ),
    ).toBe("beyondHorizon");
  });

  it("ends at the midnight after the last day", () => {
    expect(
      horizonEnd(
        { ...POLICY, horizonDays: 3 },
        BERLIN,
        new Date("2026-10-05T08:00:00Z"),
      ).toISOString(),
    ).toBe("2026-10-08T22:00:00.000Z");
  });
});

describe("bookableDays", () => {
  it("skips today inside the lead time, closures and days without hours", () => {
    const hours: OperatingHours = {
      windows: weekdays(10, 12).filter((window) => window.weekday !== 7),
      closures: ["2026-10-09"],
    };
    const days = bookableDays(
      hours,
      { ...POLICY, horizonDays: 7 },
      BERLIN,
      new Date("2026-10-05T08:00:00Z"),
    );
    expect(days.map((day) => day.date)).toEqual([
      "2026-10-07",
      "2026-10-08",
      "2026-10-10",
      "2026-10-12",
    ]);
  });
});

describe("bookingRefusal", () => {
  const now = new Date("2026-10-05T08:00:00Z");
  const at = (date: string, from: number, to: number, timeZone = BERLIN) => ({
    startsAt: instantOn(date, from * 60, timeZone),
    endsAt: instantOn(date, to * 60, timeZone),
  });

  it("accepts a window inside the hours, the lead time and the horizon", () => {
    expect(
      bookingRefusal(at("2026-10-08", 10, 11), MORNINGS, POLICY, BERLIN, now),
    ).toBeNull();
  });

  it("refuses a window inside the lead time", () => {
    expect(
      bookingRefusal(at("2026-10-06", 10, 11), MORNINGS, POLICY, BERLIN, now),
    ).toBe("leadTime");
  });

  it("refuses a window beyond the horizon", () => {
    expect(
      bookingRefusal(at("2026-10-20", 10, 11), MORNINGS, POLICY, BERLIN, now),
    ).toBe("beyondHorizon");
  });

  it("refuses a closed date", () => {
    expect(
      bookingRefusal(
        at("2026-10-08", 10, 11),
        { ...MORNINGS, closures: ["2026-10-08"] },
        POLICY,
        BERLIN,
        now,
      ),
    ).toBe("closedDate");
  });

  it("refuses a window outside the riding hours", () => {
    expect(
      bookingRefusal(at("2026-10-08", 14, 15), MORNINGS, POLICY, BERLIN, now),
    ).toBe("outsideHours");
  });

  it("keeps a chapter without hours to the open day the form offers", () => {
    const none: OperatingHours = { windows: [], closures: [] };
    expect(
      bookingRefusal(at("2026-10-08", 10, 11), none, POLICY, BERLIN, now),
    ).toBeNull();
    expect(
      bookingRefusal(at("2026-10-08", 19, 20), none, POLICY, BERLIN, now),
    ).toBe("outsideHours");
  });
});

describe("windowLabel", () => {
  const window = {
    startsAt: new Date("2026-10-08T07:00:00Z"),
    endsAt: new Date("2026-10-08T10:00:00Z"),
  };

  it("writes the chapter's clock in en-US notation", () => {
    expect(windowLabel(window, "en-US", BERLIN)).toBe("9:00 AM – 12:00 PM");
  });

  it("writes the chapter's clock in de-DE notation", () => {
    expect(windowLabel(window, "de-DE", BERLIN)).toBe("09:00 – 12:00");
  });
});
