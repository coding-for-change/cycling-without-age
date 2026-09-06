import {
  formatDistance,
  formatDuration,
  formatRelativeTime,
  wordsLocale,
} from "@/lib/format";

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

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-05T12:00:00Z");

  it("picks the largest whole unit and speaks the locale", () => {
    const fourDays = new Date("2026-09-01T12:00:00Z");
    expect(formatRelativeTime(fourDays, "en-US", now)).toBe("4d ago");
    expect(formatRelativeTime(fourDays, "de-DE", now)).toBe("vor 4 Tagen");
    expect(
      formatRelativeTime(new Date("2026-09-05T11:30:00Z"), "en-US", now),
    ).toBe("30m ago");
  });

  it("says now inside a minute", () => {
    expect(
      formatRelativeTime(new Date("2026-09-05T11:59:50Z"), "en-US", now),
    ).toBe("now");
  });
});

describe("wordsLocale", () => {
  it("follows the UI language, whatever the browser's notation", () => {
    expect(wordsLocale("de")).toBe("de-DE");
    expect(wordsLocale("da")).toBe("da-DK");
    expect(wordsLocale("en").startsWith("en")).toBe(true);
  });
});
