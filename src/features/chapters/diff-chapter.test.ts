import { chapters } from "@/features/chapters";

// `diffChapter` is pure; the facade's other exports are what pull in the client.
jest.mock("@/lib/prisma", () => ({ prisma: {} }));

const AARHUS = {
  id: "ch1",
  name: "Aarhus Nord",
  slug: "aarhus-nord",
  city: "Aarhus",
  address: "Randersvej 1",
  careHomeName: null,
  description: "",
  logo: null,
  latitude: 56.17,
  longitude: 10.2,
  serviceRadiusKm: 10,
  countryId: "dk",
  createdAt: new Date(),
  metadata: null,
};

describe("diffing a chapter edit", () => {
  it("is silent when nothing changed", () => {
    expect(
      chapters.diffChapter(AARHUS as never, { name: "Aarhus Nord" }),
    ).toEqual([]);
  });

  it("folds a moved pin and its new address into one location change", () => {
    const changes = chapters.diffChapter(AARHUS as never, {
      latitude: 56.2,
      longitude: 10.3,
      address: "Vestergade 2",
      serviceRadiusKm: 15,
    });
    expect(changes).toEqual([
      { field: "location", from: "Randersvej 1", to: "Vestergade 2" },
      { field: "serviceRadiusKm", from: "10", to: "15" },
    ]);
  });

  it("reads a cleared optional field as a change to nothing", () => {
    expect(chapters.diffChapter(AARHUS as never, { address: null })).toEqual([
      { field: "location", from: "Randersvej 1", to: "56.17000, 10.20000" },
    ]);
  });
});

describe("withDerivedTimeZone", () => {
  const munich = { latitude: 48.1351, longitude: 11.582 };

  it("re-derives the zone when the pin moves", () => {
    // Pinned in Munich, corrected to Denver — the case the rule exists for.
    expect(
      chapters.withDerivedTimeZone({
        latitude: 39.7392,
        longitude: -104.9903,
      }),
    ).toMatchObject({ timeZone: "America/Denver" });
  });

  it("leaves the input alone when only the address changed", () => {
    const input = { address: "Sonnenstraße 1" };
    expect(chapters.withDerivedTimeZone(input)).toBe(input);
  });

  it("lets an explicit zone overrule the map", () => {
    expect(
      chapters.withDerivedTimeZone({ ...munich, timeZone: "Europe/London" }),
    ).toMatchObject({ timeZone: "Europe/London" });
  });

  it("leaves the input alone when the pin is unusable", () => {
    const input = { latitude: 999, longitude: 999 };
    expect(chapters.withDerivedTimeZone(input)).toBe(input);
  });

  it("produces a history line, so the change is never silent", () => {
    const before = {
      ...AARHUS,
      latitude: 56.1629,
      longitude: 10.2039,
      timeZone: "Europe/Copenhagen",
    };
    const enriched = chapters.withDerivedTimeZone({
      latitude: 39.7392,
      longitude: -104.9903,
    });
    const fields = chapters
      .diffChapter(before as never, enriched)
      .map((change) => change.field);
    expect(fields).toContain("timeZone");
    expect(fields).toContain("location");
  });
});
