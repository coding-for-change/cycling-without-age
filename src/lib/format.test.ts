import { formatDistance, formatDuration } from "@/lib/format";

describe("formatDistance", () => {
  it("uses miles for en-US and kilometres everywhere else", () => {
    expect(formatDistance(1287, "en-US")).toBe("0.8 mi");
    expect(formatDistance(1287, "de-DE")).toBe("1,3 km");
    expect(formatDistance(1287, "da-DK")).toBe("1,3 km");
    expect(formatDistance(1287, "en-GB")).toBe("1.3 km");
  });

  it("drops to metres under a kilometre", () => {
    expect(formatDistance(450, "en-GB")).toBe("450 m");
    expect(formatDistance(454, "en-GB")).toBe("450 m");
    expect(formatDistance(40, "de-DE")).toBe("40 m");
  });

  it("drops the decimal once the number is large", () => {
    expect(formatDistance(12_400, "en-GB")).toBe("12 km");
    expect(formatDistance(612_000, "de-DE")).toBe("612 km");
  });

  it("separates decimals the way each locale does", () => {
    expect(formatDistance(5500, "de-DE")).toBe("5,5 km");
    expect(formatDistance(5500, "en-GB")).toBe("5.5 km");
  });

  it("handles zero", () => {
    expect(formatDistance(0, "en-GB")).toBe("0 m");
  });
});

describe("formatDuration", () => {
  it("reads as minutes below an hour, localised", () => {
    expect(formatDuration(8 * 60, "en-GB")).toBe("8 mins");
    expect(formatDuration(8 * 60, "en-US")).toBe("8 min");
    expect(formatDuration(8 * 60, "de-DE")).toBe("8 Min.");
    expect(formatDuration(8 * 60, "da-DK")).toBe("8 min.");
  });

  it("rounds up, because an underestimate is the worse error", () => {
    expect(formatDuration(61, "en-GB")).toBe("2 mins");
    expect(formatDuration(1, "en-GB")).toBe("1 min");
    expect(formatDuration(0, "en-GB")).toBe("1 min");
  });

  it("splits into hours and minutes past the hour", () => {
    expect(formatDuration(80 * 60, "en-GB")).toBe("1 hr 20 mins");
    expect(formatDuration(120 * 60, "en-GB")).toBe("2 hrs");
  });
});
