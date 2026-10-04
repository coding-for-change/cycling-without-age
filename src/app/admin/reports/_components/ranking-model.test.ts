import {
  metricValue,
  parseRankMetric,
  parseRankingTab,
  rankRows,
  rankingTabs,
  rescopeHref,
  withParam,
} from "./ranking-model";

const tally = (rides: number, previousRides: number, hours = 0) => ({
  rides,
  trips: rides,
  hours,
  previousRides,
  previousTrips: previousRides,
  previousHours: 0,
});

describe("rankingTabs", () => {
  it("shows names only at chapter scope", () => {
    expect(rankingTabs("chapter", 1)).toEqual(["pilots", "riders"]);
    expect(rankingTabs("country", 1)).toEqual(["chapters"]);
    expect(rankingTabs("all", 3)).toEqual(["chapters", "countries"]);
  });

  it("drops the countries tab when the scope covers one country", () => {
    expect(rankingTabs("all", 1)).toEqual(["chapters"]);
  });
});

describe("parseRankMetric", () => {
  it("allows rides per active pilot for chapters only", () => {
    expect(parseRankMetric("perPilot", "chapters")).toBe("perPilot");
    expect(parseRankMetric("perPilot", "pilots")).toBe("rides");
    expect(parseRankMetric("hours", "riders")).toBe("hours");
    expect(parseRankMetric("bogus", "chapters")).toBe("rides");
    expect(parseRankMetric(null, "chapters")).toBe("rides");
  });

  it("accepts only tabs on offer", () => {
    expect(parseRankingTab("pilots", ["chapters"])).toBeNull();
    expect(parseRankingTab("chapters", ["chapters"])).toBe("chapters");
  });
});

describe("metricValue", () => {
  it("divides by active pilots and leaves chapters without pilots unranked", () => {
    expect(
      metricValue({ ...tally(10, 4), activePilots: 4 }, "perPilot"),
    ).toEqual({ current: 2.5, previous: 1 });
    expect(
      metricValue({ ...tally(10, 4), activePilots: 0 }, "perPilot"),
    ).toEqual({ current: null, previous: null });
  });

  it("reads hours", () => {
    expect(metricValue(tally(1, 1, 7.5), "hours").current).toBe(7.5);
  });
});

describe("rankRows", () => {
  const rows = [
    { id: "a", current: 30, previous: 5 },
    { id: "b", current: 20, previous: 40 },
    { id: "c", current: 20, previous: 0 },
    { id: "d", current: 0, previous: 10 },
  ];
  const ranked = rankRows(
    rows,
    (row) => row.current,
    (row) => row.previous,
  );

  it("drops rows without a value and keeps the given order on ties", () => {
    expect(ranked.map((entry) => entry.row.id)).toEqual(["a", "b", "c"]);
  });

  it("measures movement against the previous ranking", () => {
    expect(ranked.map((entry) => entry.movement)).toEqual([2, -1, null]);
    expect(ranked.map((entry) => entry.previousRank)).toEqual([3, 1, null]);
  });

  it("scales bars to the leader", () => {
    expect(ranked.map((entry) => entry.share)).toEqual([1, 2 / 3, 2 / 3]);
  });

  it("returns nothing for an empty period", () => {
    expect(
      rankRows(
        [],
        () => 1,
        () => 1,
      ),
    ).toEqual([]);
  });
});

describe("links", () => {
  it("keeps the timeframe and drops everything else when rescoping", () => {
    expect(
      rescopeHref(
        "/admin/reports",
        "range=90d&country=DE&ranking=chapters&rank=hours",
        { chapter: "muenchen" },
      ),
    ).toBe("/admin/reports?range=90d&rank=hours&chapter=muenchen");
    expect(
      rescopeHref("/admin/reports", "from=2026-01-01&to=2026-02-01", {
        country: "DK",
      }),
    ).toBe("/admin/reports?from=2026-01-01&to=2026-02-01&country=DK");
  });

  it("sets and clears one param", () => {
    expect(withParam("/r", "range=7d", "ranking", "pilots")).toBe(
      "/r?range=7d&ranking=pilots",
    );
    expect(withParam("/r", "ranking=pilots", "ranking", null)).toBe("/r");
  });
});
