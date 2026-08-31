import { distanceMeters } from "@/lib/geo";

const MUNICH = { lat: 48.1361, lng: 11.5647 };
const HAMBURG = { lat: 53.5603, lng: 9.9906 };
const COPENHAGEN = { lat: 55.6884, lng: 12.5527 };

describe("distanceMeters", () => {
  it("matches the known Munich–Hamburg great-circle distance", () => {
    expect(distanceMeters(MUNICH, HAMBURG) / 1000).toBeCloseTo(612, -1);
  });

  it("matches the known Hamburg–Copenhagen distance", () => {
    expect(distanceMeters(HAMBURG, COPENHAGEN) / 1000).toBeCloseTo(288, -1);
  });

  it("is zero for the same point", () => {
    expect(distanceMeters(MUNICH, MUNICH)).toBe(0);
  });

  it("is symmetric", () => {
    expect(distanceMeters(MUNICH, HAMBURG)).toBeCloseTo(
      distanceMeters(HAMBURG, MUNICH),
      6,
    );
  });

  it("does not return NaN for antipodal points", () => {
    expect(
      distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 180 }),
    ).toBeCloseTo(Math.PI * 6_371_008.8, 3);
  });
});
