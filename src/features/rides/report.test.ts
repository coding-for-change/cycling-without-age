import {
  addTally,
  aggregateActivity,
  countryRollup,
  emptyTally,
  newRiders,
  peopleHealth,
  ranked,
  tallies,
  yearBefore,
  type ActivityBucketRow,
  type ActivityFacts,
  type ActivityTallyRow,
} from "./report";
import { resolveReportRange } from "./report-range";

const today = "2026-10-04";
const MUC = "chapter-muenchen";
const NYC = "chapter-newyork";
const HOUR = 3_600_000;

const row = (
  bucket: string,
  patch: Partial<ActivityBucketRow> = {},
): ActivityBucketRow => ({
  side: "current",
  bucket,
  model: "event",
  kind: "ridden",
  category: null,
  trips: 1,
  rides: 1,
  ms: 2 * HOUR,
  ...patch,
});

const cancelled = (
  bucket: string,
  patch: Partial<ActivityBucketRow> = {},
): ActivityBucketRow =>
  row(bucket, { kind: "cancelled", rides: 0, ms: 0, ...patch });

const tally = (
  key: string,
  patch: Partial<ActivityTallyRow> = {},
): ActivityTallyRow => ({
  key,
  side: "current",
  trips: 1,
  rides: 1,
  ms: 2 * HOUR,
  ...patch,
});

const aggregate = (
  buckets: ActivityBucketRow[],
  extra: Partial<ActivityFacts> & {
    range?: ReturnType<typeof resolveReportRange>;
  } = {},
) =>
  aggregateActivity({
    range: resolveReportRange({ range: "7d" }, { today }),
    buckets,
    chapters: [],
    riders: [],
    ...extra,
  });

describe("aggregateActivity", () => {
  it("counts two riders on one trip as two rides and one trip", () => {
    const result = aggregate([row("2026-10-01", { rides: 2 })], {
      riders: [{ side: "current", riders: 2, newRiders: 0 }],
    });
    expect(result.totals.rides.current).toBe(2);
    expect(result.totals.trips.current).toBe(1);
    expect(result.totals.riders.current).toBe(2);
    expect(result.totals.hours.current).toBe(2);
  });

  it("leaves cancelled trips out of rides but counts them as cancellations", () => {
    const result = aggregate([
      row("2026-10-01"),
      cancelled("2026-10-02", { category: "weather" }),
      cancelled("2026-10-03"),
    ]);
    expect(result.totals.rides.current).toBe(1);
    expect(result.totals.trips.current).toBe(1);
    expect(result.totals.cancellations.current).toBe(2);
    expect(result.totals.cancellationRate.current).toBeCloseTo(2 / 3);
    const byCategory = Object.fromEntries(
      result.cancellations.map((c) => [c.category, c.count]),
    );
    expect(byCategory).toMatchObject({
      weather: 1,
      uncategorised: 1,
      rider: 0,
    });
    const bucket = result.series.find((b) => b.start === "2026-10-02");
    expect(bucket?.cancellations.total).toBe(1);
    expect(bucket?.rides.total).toBe(0);
  });

  it("splits by ride model per bucket", () => {
    const result = aggregate([
      row("2026-10-01", { model: "pleasure" }),
      row("2026-10-01", { model: "functional", rides: 2 }),
    ]);
    const bucket = result.series.find((b) => b.start === "2026-10-01");
    expect(bucket?.rides).toEqual({
      event: 0,
      pleasure: 1,
      functional: 2,
      total: 3,
    });
    expect(bucket?.trips.total).toBe(2);
    expect(result.models.find((m) => m.model === "functional")).toMatchObject({
      rides: 2,
      hours: 2,
    });
  });

  it("compares with the previous period and aligns it to the chart", () => {
    const result = aggregate([
      row("2026-09-29"),
      row("2026-09-30"),
      row("2026-10-01"),
      row("2026-09-29", { side: "previous" }),
      row("2026-09-30", { side: "previous" }),
    ]);
    expect(result.totals.rides).toEqual({
      current: 3,
      previous: 2,
      delta: 0.5,
    });
    const bucket = result.series.find((b) => b.start === "2026-09-29");
    expect(bucket?.previous.rides).toBe(1);
    expect(result.series).toHaveLength(7);
  });

  it("counts a previous trip outside the chart in the totals only", () => {
    const result = aggregate([row("2026-09-01", { side: "previous" })]);
    expect(result.totals.rides.previous).toBe(1);
    expect(result.series.every((b) => b.previous.rides === 0)).toBe(true);
  });

  it("has no delta when there was nothing before", () => {
    const result = aggregate([row("2026-10-01")]);
    expect(result.totals.rides.delta).toBeNull();
    expect(result.totals.cancellationRate.deltaPoints).toBeNull();
  });

  it("rounds hours once, after summing", () => {
    const result = aggregate([
      row("2026-10-01", { ms: HOUR / 3 }),
      row("2026-10-01", { ms: HOUR / 3, model: "pleasure" }),
      row("2026-10-02", { ms: HOUR / 3 }),
    ]);
    expect(result.totals.hours.current).toBe(1);
    expect(result.series.find((b) => b.start === "2026-10-01")?.hours).toEqual({
      event: 0.3,
      pleasure: 0.3,
      functional: 0,
      total: 0.7,
    });
  });

  it("tallies chapters for both periods", () => {
    const result = aggregate([], {
      chapters: [
        tally(MUC, { rides: 2 }),
        tally(NYC),
        tally(MUC, { side: "previous" }),
      ],
    });
    expect(result.chapters[MUC]).toEqual({
      rides: 2,
      trips: 1,
      hours: 2,
      previousRides: 1,
      previousTrips: 1,
      previousHours: 2,
    });
    expect(result.chapters[NYC].rides).toBe(1);
  });

  it("buckets the previous year into the matching month", () => {
    const range = resolveReportRange({ range: "12m" }, { today });
    const result = aggregate(
      [
        row("2026-03-01"),
        row("2026-03-01", { side: "previous", rides: 2, trips: 2 }),
      ],
      { range },
    );
    const march = result.series.find((b) => b.start === "2026-03-01");
    expect(march?.rides.total).toBe(1);
    expect(march?.previous.rides).toBe(2);
    expect(result.series).toHaveLength(12);
  });
});

describe("tallies", () => {
  it("adds up pilots and riders per period", () => {
    const table = tallies([
      tally("pilot-b", { rides: 2 }),
      tally("pilot-b"),
      tally("pilot-a", { rides: 2 }),
      tally("pilot-a", { side: "previous" }),
    ]);
    expect(table["pilot-b"]).toMatchObject({ rides: 3, trips: 2, hours: 4 });
    expect(table["pilot-a"]).toMatchObject({
      rides: 2,
      previousRides: 1,
      previousHours: 2,
    });
  });

  it("rounds hours to one decimal", () => {
    expect(
      tallies([tally("rider-1", { ms: (7 * HOUR) / 6 })])["rider-1"],
    ).toMatchObject({ hours: 1.2 });
  });
});

describe("newRiders", () => {
  it("compares new riders of both periods", () => {
    expect(
      newRiders([
        { side: "current", riders: 3, newRiders: 1 },
        { side: "previous", riders: 1, newRiders: 1 },
      ]),
    ).toEqual({ current: 1, previous: 1, delta: 0 });
    expect(newRiders([])).toEqual({ current: 0, previous: 0, delta: null });
  });
});

describe("ranked", () => {
  const person = (
    id: string,
    name: string,
    patch: Partial<ReturnType<typeof emptyTally>> = {},
  ) => ({
    id,
    name,
    ...emptyTally(),
    ...patch,
  });

  it("orders by rides, then hours, trips, name and id", () => {
    const rows = ranked([
      person("c", "Bea", { rides: 1 }),
      person("b", "Ann", { rides: 1 }),
      person("a", "Ann", { rides: 1 }),
      person("d", "Zed", { rides: 1, hours: 2 }),
      person("e", "Eve", { rides: 3 }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["e", "d", "a", "b", "c"]);
  });
});

describe("countryRollup", () => {
  const chapter = (
    countryCode: string,
    patch: Partial<ReturnType<typeof emptyTally>> & { activePilots?: number },
  ) => ({
    countryCode,
    countryName: countryCode === "DE" ? "Deutschland" : "Danmark",
    activePilots: 0,
    ...emptyTally(),
    ...patch,
  });

  it("sums chapters into their country and ranks the countries", () => {
    const countries = countryRollup([
      chapter("DE", { rides: 2, hours: 1.25, activePilots: 2 }),
      chapter("DK", { rides: 5, hours: 3 }),
      chapter("DE", {
        rides: 1,
        hours: 0.1,
        previousRides: 4,
        activePilots: 1,
      }),
    ]);
    expect(countries).toEqual([
      expect.objectContaining({ code: "DK", rides: 5 }),
      expect.objectContaining({
        code: "DE",
        name: "Deutschland",
        rides: 3,
        hours: 1.4,
        previousRides: 4,
        activePilots: 3,
      }),
    ]);
  });
});

describe("addTally", () => {
  it("adds every field and keeps hours at one decimal", () => {
    const into = { ...emptyTally(), rides: 1, hours: 0.1, previousHours: 0.2 };
    addTally(into, {
      ...emptyTally(),
      rides: 2,
      hours: 0.2,
      previousHours: 0.1,
      previousTrips: 3,
    });
    expect(into).toEqual({
      rides: 3,
      trips: 0,
      hours: 0.3,
      previousRides: 0,
      previousTrips: 3,
      previousHours: 0.3,
    });
  });
});

describe("yearBefore", () => {
  it("goes back one calendar year", () => {
    expect(yearBefore(new Date("2026-10-04T12:00:00Z")).toISOString()).toBe(
      "2025-10-04T12:00:00.000Z",
    );
  });
});

describe("peopleHealth", () => {
  it("counts pilots and riders without a ride in the year as inactive", () => {
    const health = peopleHealth(
      {
        pilots: [
          { userId: "pilot-a", chapterId: MUC },
          { userId: "pilot-a", chapterId: NYC },
          { userId: "pilot-b", chapterId: MUC },
          { userId: "pilot-c", chapterId: NYC },
        ],
        riders: 3,
      },
      {
        pilots: [
          { userId: "pilot-a", chapterId: NYC },
          { userId: "pilot-z", chapterId: MUC },
        ],
        riders: 1,
      },
    );
    expect(health).toEqual({
      activePilots: 1,
      inactivePilots: 2,
      activeRiders: 1,
      inactiveRiders: 2,
      activePilotsByChapter: { [NYC]: 1 },
    });
  });
});
