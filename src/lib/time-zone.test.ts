import {
  FALLBACK_TIME_ZONE,
  defaultTimeZoneForCountry,
  isValidTimeZone,
  resolveChapterTimeZone,
  timeZoneForCoordinates,
} from "./time-zone";

describe("isValidTimeZone", () => {
  it("accepts a zone this runtime knows", () => {
    expect(isValidTimeZone("Europe/Berlin")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidTimeZone("Europe/Munich")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("timeZoneForCoordinates", () => {
  // The whole point of reading the pin: a country cannot answer these.
  it.each([
    ["München", 48.1351, 11.582, "Europe/Berlin"],
    ["København", 55.6761, 12.5683, "Europe/Copenhagen"],
    ["Denver", 39.7392, -104.9903, "America/Denver"],
    ["New York", 40.7128, -74.006, "America/New_York"],
    ["Brisbane", -27.4698, 153.0251, "Australia/Brisbane"],
    ["Perth", -31.9523, 115.8613, "Australia/Perth"],
    ["Vancouver", 49.2827, -123.1207, "America/Vancouver"],
    ["Santa Cruz de Tenerife", 28.4636, -16.2518, "Atlantic/Canary"],
    ["Ponta Delgada", 37.7412, -25.6756, "Atlantic/Azores"],
    ["Auckland", -36.8485, 174.7633, "Pacific/Auckland"],
  ])("resolves %s", (_place, lat, lng, expected) => {
    expect(timeZoneForCoordinates(lat, lng)).toBe(expected);
  });

  it("returns null rather than throwing on impossible coordinates", () => {
    expect(timeZoneForCoordinates(91, 0)).toBeNull();
    expect(timeZoneForCoordinates(0, 181)).toBeNull();
    expect(timeZoneForCoordinates(Number.NaN, Number.NaN)).toBeNull();
  });
});

describe("defaultTimeZoneForCountry", () => {
  it("answers for a single-zone market", () => {
    expect(defaultTimeZoneForCountry("DE")).toBe("Europe/Berlin");
    expect(defaultTimeZoneForCountry("dk")).toBe("Europe/Copenhagen");
  });

  it("refuses to guess for a country spanning several", () => {
    for (const code of ["US", "CA", "AU", "ES", "PT", "NZ"]) {
      expect(defaultTimeZoneForCountry(code)).toBeNull();
    }
  });
});

describe("resolveChapterTimeZone", () => {
  it("prefers the pin over the country", () => {
    // A US chapter is exactly the case the country map cannot serve.
    expect(
      resolveChapterTimeZone({
        latitude: 39.7392,
        longitude: -104.9903,
        countryCode: "US",
      }),
    ).toBe("America/Denver");
  });

  it("falls back to the country when there is no pin", () => {
    expect(resolveChapterTimeZone({ countryCode: "DE" })).toBe("Europe/Berlin");
  });

  it("falls back to the country when the pin is unusable", () => {
    expect(
      resolveChapterTimeZone({
        latitude: 999,
        longitude: 999,
        countryCode: "DK",
      }),
    ).toBe("Europe/Copenhagen");
  });

  it("lands on UTC rather than throwing when it knows nothing", () => {
    expect(resolveChapterTimeZone({})).toBe(FALLBACK_TIME_ZONE);
    expect(resolveChapterTimeZone({ countryCode: "US" })).toBe(
      FALLBACK_TIME_ZONE,
    );
  });
});
