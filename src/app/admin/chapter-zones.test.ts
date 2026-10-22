import { zoneLookup } from "./chapter-zones";

jest.mock("@/features/chapters", () => ({ chapters: {} }));

const zones = [
  { id: "berlin", name: "Berlin", timeZone: "Europe/Berlin" },
  { id: "denver", name: "Denver", timeZone: "America/Denver" },
];

describe("zoneLookup", () => {
  it("reads a stamp on its own chapter's clock", () => {
    expect(zoneLookup(zones)("denver")).toBe("America/Denver");
  });

  it("falls back to the scope's first chapter when the stamp has none", () => {
    expect(zoneLookup(zones)(null)).toBe("Europe/Berlin");
    expect(zoneLookup(zones)("elsewhere")).toBe("Europe/Berlin");
  });

  it("falls back to UTC with no chapters at all", () => {
    expect(zoneLookup([])(undefined)).toBe("UTC");
  });
});
