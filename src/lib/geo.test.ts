import { circleRing, distanceMeters, googleMapsUrl } from "./geo";

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

describe("googleMapsUrl", () => {
  it("prefers coordinates over the address", () => {
    expect(
      googleMapsUrl({
        address: "Sonnenstraße 12",
        latitude: 48.1,
        longitude: 11.5,
      }),
    ).toBe("https://www.google.com/maps/search/?api=1&query=48.1%2C11.5");
  });

  it("falls back to the address", () => {
    expect(
      googleMapsUrl({
        address: " Sonnenstraße 12 ",
        latitude: null,
        longitude: null,
      }),
    ).toBe(
      "https://www.google.com/maps/search/?api=1&query=Sonnenstra%C3%9Fe%2012",
    );
  });

  it("returns null without a place", () => {
    expect(
      googleMapsUrl({ address: "  ", latitude: null, longitude: null }),
    ).toBeNull();
  });
});
