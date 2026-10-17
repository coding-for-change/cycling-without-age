import { localDate, stampOf } from "./training-stamp";

const context = {
  notation: "de-DE" as const,
  words: "de",
  timeZone: "Europe/Berlin",
  now: new Date("2026-10-16T12:00:00Z"),
};

describe("localDate", () => {
  it("uses the chapter's calendar day, not UTC's", () => {
    expect(localDate(new Date("2026-10-15T22:30:00Z"), context)).toBe(
      "16.10.2026",
    );
  });
});

describe("stampOf", () => {
  it("is empty without an instant", () => {
    expect(stampOf(null, context)).toBeNull();
  });

  it("carries the ISO instant, a label and the absolute time as title", () => {
    const at = new Date("2026-10-14T12:00:00Z");
    expect(stampOf(at, context)).toEqual({
      at: "2026-10-14T12:00:00.000Z",
      label: "14.10.2026",
      title: "14.10.26, 14:00",
    });
    expect(stampOf(at, context, true)?.label).toBe("vorgestern");
  });
});
