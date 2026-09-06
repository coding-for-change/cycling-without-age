import { circleRing, distanceMeters } from "./geo";

describe("circleRing", () => {
  const aarhus = { lat: 56.17, lng: 10.2 };

  it("closes the ring and keeps every point at the asked radius", () => {
    const ring = circleRing(aarhus, 10_000, 32);
    expect(ring).toHaveLength(33);
    expect(ring[0]).toEqual(ring[32]);
    for (const [lng, lat] of ring) {
      expect(distanceMeters(aarhus, { lat, lng })).toBeCloseTo(10_000, -2);
    }
  });
});
