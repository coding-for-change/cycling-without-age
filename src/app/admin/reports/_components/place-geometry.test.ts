import { maxRides, radiusStops, totalRides } from "./place-geometry";

describe("radiusStops", () => {
  it("maps the square root of the largest bubble to the maximum radius", () => {
    expect(radiusStops(400)).toEqual([0, 10, 20, 32]);
  });

  it("keeps the stops ascending for an empty scope", () => {
    expect(radiusStops(0)).toEqual([0, 10, 1, 32]);
  });
});

describe("maxRides / totalRides", () => {
  const chapters = [{ rides: 3 }, { rides: 9 }, { rides: 0 }];

  it("finds the busiest chapter", () => {
    expect(maxRides(chapters)).toBe(9);
    expect(maxRides([])).toBe(0);
  });

  it("sums every chapter so a cluster never outgrows the scale", () => {
    expect(totalRides(chapters)).toBe(12);
  });
});
