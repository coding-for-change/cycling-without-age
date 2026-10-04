import {
  bucketKeys,
  grainFor,
  localDate,
  localMidnight,
  periodBounds,
  reportRangeParams,
  resolveReportRange,
} from "./report-range";

const today = "2026-10-04";

describe("resolveReportRange", () => {
  it("falls back to the last 30 days without a parameter", () => {
    const range = resolveReportRange({}, { today });
    expect(range).toMatchObject({
      preset: "30d",
      from: "2026-09-05",
      to: "2026-10-05",
      last: today,
      days: 30,
      grain: "day",
      previous: { from: "2026-08-06", to: "2026-09-05" },
    });
  });

  it.each([
    [{ range: "decade" }],
    [{ from: "2026-13-01", to: "2026-10-01" }],
    [{ from: "2026-02-30", to: "2026-03-01" }],
    [{ from: "2026-10-01" }],
    [{ from: "2026-09-10", to: "2026-09-01" }],
    [{ from: "2027-01-01", to: "2027-02-01" }],
  ])("treats %j as invalid and shows 30 days", (params) => {
    expect(resolveReportRange(params, { today }).preset).toBe("30d");
  });

  it("covers the last seven days including today", () => {
    const range = resolveReportRange({ range: "7d" }, { today });
    expect(range).toMatchObject({
      from: "2026-09-28",
      to: "2026-10-05",
      days: 7,
      grain: "day",
      previous: { from: "2026-09-21", to: "2026-09-28" },
    });
  });

  it("shows 90 days by week", () => {
    const range = resolveReportRange({ range: "90d" }, { today });
    expect(range).toMatchObject({ days: 90, grain: "week" });
    expect(range.previous.to).toBe(range.from);
  });

  it("compares year to date with the same span last year", () => {
    const range = resolveReportRange({ range: "ytd" }, { today });
    expect(range).toMatchObject({
      from: "2026-01-01",
      to: "2026-10-05",
      grain: "month",
      previous: { from: "2025-01-01", to: "2025-10-05" },
      shift: { unit: "year", amount: 1 },
    });
  });

  it("starts twelve months at the first of the month eleven months ago", () => {
    const range = resolveReportRange({ range: "12m" }, { today });
    expect(range).toMatchObject({
      from: "2025-11-01",
      to: "2026-10-05",
      grain: "month",
      previous: { from: "2024-11-01", to: "2025-10-05" },
    });
  });

  it("starts all time at the month of the earliest ride", () => {
    const range = resolveReportRange(
      { range: "all" },
      { today, earliest: "2025-03-17" },
    );
    expect(range).toMatchObject({ from: "2025-03-01", grain: "month" });
    expect(range.previous.to).toBe("2025-03-01");
  });

  it("starts all time at a floor when there is no ride or a bogus one", () => {
    expect(resolveReportRange({ range: "all" }, { today }).from).toBe(
      "2025-11-01",
    );
    expect(
      resolveReportRange({ range: "all" }, { today, earliest: "1999-01-05" })
        .from,
    ).toBe("2015-01-01");
  });

  it("takes a custom range with both days included", () => {
    const range = resolveReportRange(
      { from: "2026-09-01", to: "2026-09-10", range: "12m" },
      { today },
    );
    expect(range).toMatchObject({
      preset: "custom",
      from: "2026-09-01",
      to: "2026-09-11",
      last: "2026-09-10",
      days: 10,
      grain: "day",
      previous: { from: "2026-08-22", to: "2026-09-01" },
    });
  });

  it("clamps a custom range to today and the floor", () => {
    const range = resolveReportRange(
      { from: "2010-01-01", to: "2026-12-31" },
      { today },
    );
    expect(range).toMatchObject({ from: "2015-01-01", last: today });
  });
});

describe("grainFor", () => {
  it.each([
    [1, "day"],
    [31, "day"],
    [32, "week"],
    [184, "week"],
    [185, "month"],
  ])("%i days → %s", (days, grain) => {
    expect(grainFor(days)).toBe(grain);
  });
});

describe("bucketKeys", () => {
  it("lists every day of a short period", () => {
    expect(bucketKeys({ from: "2026-09-28", to: "2026-10-02" }, "day")).toEqual(
      ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"],
    );
  });

  it("starts weeks on Monday, including one that begins before the period", () => {
    expect(
      bucketKeys({ from: "2026-09-03", to: "2026-09-20" }, "week"),
    ).toEqual(["2026-08-31", "2026-09-07", "2026-09-14"]);
  });

  it("lists months", () => {
    expect(
      bucketKeys({ from: "2025-11-01", to: "2026-02-15" }, "month"),
    ).toEqual(["2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01"]);
  });
});

describe("chapter-local dates", () => {
  it("puts a late evening ride in Munich on the next local day after midnight", () => {
    expect(localDate(new Date("2026-06-30T22:30:00Z"), "Europe/Berlin")).toBe(
      "2026-07-01",
    );
    expect(localDate(new Date("2026-06-30T22:30:00Z"), "UTC")).toBe(
      "2026-06-30",
    );
  });

  it("finds local midnight across a DST change", () => {
    expect(localMidnight("2026-03-29", "Europe/Berlin").toISOString()).toBe(
      "2026-03-28T23:00:00.000Z",
    );
    expect(localMidnight("2026-03-30", "Europe/Berlin").toISOString()).toBe(
      "2026-03-29T22:00:00.000Z",
    );
  });

  it("widens query bounds enough for every zone", () => {
    const bounds = periodBounds({ from: "2026-09-01", to: "2026-09-02" });
    expect(bounds.from.getTime()).toBeLessThanOrEqual(
      localMidnight("2026-09-01", "Pacific/Kiritimati").getTime(),
    );
    expect(bounds.to.getTime()).toBeGreaterThanOrEqual(
      localMidnight("2026-09-02", "Pacific/Pago_Pago").getTime(),
    );
  });
});

describe("reportRangeParams", () => {
  it("keeps only a valid preset", () => {
    expect(reportRangeParams({ range: "90d" })).toEqual({ range: "90d" });
    expect(reportRangeParams({ range: "x".repeat(5000) })).toEqual({});
  });

  it("keeps a real custom range and drops the preset beside it", () => {
    expect(
      reportRangeParams({ range: "7d", from: "2026-01-01", to: "2026-02-01" }),
    ).toEqual({ from: "2026-01-01", to: "2026-02-01" });
  });

  it("drops impossible or partial dates", () => {
    expect(reportRangeParams({ from: "2026-02-30", to: "2026-03-01" })).toEqual(
      {},
    );
    expect(reportRangeParams({ from: "2026-01-01" })).toEqual({});
  });
});
