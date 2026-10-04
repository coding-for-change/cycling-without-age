import { aggregateActivity, peopleHealth, type ReportFact } from "./report";
import { resolveReportRange } from "./report-range";

const now = new Date("2026-10-04T12:00:00Z");
const today = "2026-10-04";
const MUC = "chapter-muenchen";
const NYC = "chapter-newyork";
const tzByChapter = { [MUC]: "Europe/Berlin", [NYC]: "America/New_York" };

let seq = 0;
const ride = (
  startsAt: string,
  patch: Partial<ReportFact> = {},
): ReportFact => {
  const start = new Date(startsAt);
  return {
    id: `ride-${++seq}`,
    chapterId: MUC,
    model: "event",
    status: "scheduled",
    startsAt: start,
    endsAt: new Date(start.getTime() + 2 * 3_600_000),
    cancellationCategory: null,
    pilotIds: ["pilot-a"],
    passengerIds: ["rider-1"],
    ...patch,
  };
};

const aggregate = (
  current: ReportFact[],
  previous: ReportFact[] = [],
  extra: Partial<Parameters<typeof aggregateActivity>[0]> = {},
) =>
  aggregateActivity({
    current,
    previous,
    tzByChapter,
    range: resolveReportRange({ range: "7d" }, { today }),
    now,
    ridersBeforeCurrent: [],
    ridersBeforePrevious: [],
    ...extra,
  });

describe("aggregateActivity", () => {
  it("counts two riders on one trip as two rides and one trip", () => {
    const result = aggregate([
      ride("2026-10-01T08:00:00Z", { passengerIds: ["rider-1", "rider-2"] }),
    ]);
    expect(result.totals.rides.current).toBe(2);
    expect(result.totals.trips.current).toBe(1);
    expect(result.totals.riders.current).toBe(2);
    expect(result.totals.hours.current).toBe(2);
  });

  it("leaves cancelled trips out of rides but counts them as cancellations", () => {
    const result = aggregate([
      ride("2026-10-01T08:00:00Z"),
      ride("2026-10-02T08:00:00Z", {
        status: "cancelled",
        cancellationCategory: "weather",
        passengerIds: ["rider-1", "rider-2"],
      }),
      ride("2026-10-03T08:00:00Z", { status: "cancelled" }),
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

  it("does not count a trip that has not ended yet", () => {
    const result = aggregate([ride("2026-10-04T11:00:00Z")]);
    expect(result.totals.rides.current).toBe(0);
    expect(result.totals.trips.current).toBe(0);
  });

  it("buckets by the chapter's own calendar day", () => {
    const result = aggregate([
      ride("2026-09-30T22:30:00Z"),
      ride("2026-10-01T02:30:00Z", { chapterId: NYC }),
    ]);
    const day = (start: string) =>
      result.series.find((b) => b.start === start)?.rides.total;
    expect(day("2026-10-01")).toBe(1);
    expect(day("2026-09-30")).toBe(1);
  });

  it("keeps a ride that is before the period in local time out of it", () => {
    const result = aggregate([ride("2026-09-27T21:30:00Z")]);
    expect(result.totals.rides.current).toBe(0);
    const inside = aggregate([ride("2026-09-27T22:30:00Z")]);
    expect(inside.totals.rides.current).toBe(1);
  });

  it("splits by ride model per bucket", () => {
    const result = aggregate([
      ride("2026-10-01T08:00:00Z", { model: "pleasure" }),
      ride("2026-10-01T12:00:00Z", {
        model: "functional",
        passengerIds: ["rider-2", "rider-3"],
      }),
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
      trips: 1,
      hours: 2,
    });
  });

  it("compares with the previous period and aligns it to the chart", () => {
    const result = aggregate(
      [
        ride("2026-09-29T08:00:00Z"),
        ride("2026-09-30T08:00:00Z"),
        ride("2026-10-01T08:00:00Z"),
      ],
      [ride("2026-09-22T08:00:00Z"), ride("2026-09-23T08:00:00Z")],
    );
    expect(result.totals.rides).toEqual({
      current: 3,
      previous: 2,
      delta: 0.5,
    });
    const bucket = result.series.find((b) => b.start === "2026-09-29");
    expect(bucket?.previous.rides).toBe(1);
    expect(result.series).toHaveLength(7);
  });

  it("has no delta when there was nothing before", () => {
    const result = aggregate([ride("2026-10-01T08:00:00Z")]);
    expect(result.totals.rides.delta).toBeNull();
    expect(result.totals.cancellationRate.deltaPoints).toBeNull();
  });

  it("counts a ride fetched twice only once", () => {
    const shared = ride("2026-10-01T08:00:00Z");
    const result = aggregate([shared], [shared]);
    expect(result.totals.rides.current).toBe(1);
    expect(result.totals.rides.previous).toBe(0);
  });

  it("tallies chapters, pilots and riders for both periods", () => {
    const result = aggregate(
      [
        ride("2026-10-01T08:00:00Z", {
          pilotIds: ["pilot-a", "pilot-b"],
          passengerIds: ["rider-1", "rider-2"],
        }),
        ride("2026-10-02T08:00:00Z", { chapterId: NYC, pilotIds: ["pilot-b"] }),
      ],
      [ride("2026-09-22T08:00:00Z")],
    );
    expect(result.chapters[MUC]).toEqual({
      rides: 2,
      trips: 1,
      hours: 2,
      previousRides: 1,
      previousTrips: 1,
      previousHours: 2,
    });
    expect(result.chapters[NYC].rides).toBe(1);
    expect(result.pilots["pilot-b"]).toMatchObject({
      rides: 3,
      trips: 2,
      hours: 4,
    });
    expect(result.pilots["pilot-a"]).toMatchObject({
      rides: 2,
      previousRides: 1,
    });
    expect(result.riders["rider-1"]).toMatchObject({
      rides: 2,
      hours: 4,
      previousRides: 1,
    });
  });

  it("tells new riders from returning ones", () => {
    const result = aggregate(
      [
        ride("2026-10-01T08:00:00Z", {
          passengerIds: ["rider-new", "rider-old", "rider-last-week"],
        }),
      ],
      [ride("2026-09-22T08:00:00Z", { passengerIds: ["rider-last-week"] })],
      { ridersBeforeCurrent: ["rider-old"] },
    );
    expect(result.newRiderIds).toEqual(["rider-new"]);
    expect(result.totals.newRiders.current).toBe(1);
    expect(result.totals.newRiders.previous).toBe(1);
  });

  it("treats a ride just before the period as a prior ride", () => {
    const result = aggregate([
      ride("2026-09-27T08:00:00Z", { passengerIds: ["rider-x"] }),
      ride("2026-09-29T08:00:00Z", { passengerIds: ["rider-x"] }),
    ]);
    expect(result.newRiderIds).toEqual([]);
  });

  it("buckets the previous year into the matching month", () => {
    const range = resolveReportRange({ range: "12m" }, { today });
    const result = aggregate(
      [ride("2026-03-10T08:00:00Z")],
      [ride("2025-03-20T08:00:00Z"), ride("2025-03-21T08:00:00Z")],
      { range },
    );
    const march = result.series.find((b) => b.start === "2026-03-01");
    expect(march?.rides.total).toBe(1);
    expect(march?.previous.rides).toBe(2);
    expect(result.series).toHaveLength(12);
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
        passengers: [
          { id: "rider-1", chapterId: MUC },
          { id: "rider-2", chapterId: MUC },
          { id: "rider-3", chapterId: NYC },
        ],
      },
      {
        pilots: [
          { userId: "pilot-a", chapterId: NYC },
          { userId: "pilot-z", chapterId: MUC },
        ],
        passengers: [{ passengerId: "rider-1", chapterId: MUC }],
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
