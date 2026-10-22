import { daypartOf, daypartScript } from "./daypart";

describe("daypartOf", () => {
  it.each([
    [0, "night"],
    [4, "night"],
    [5, "morning"],
    [11, "morning"],
    [12, "afternoon"],
    [16, "afternoon"],
    [17, "evening"],
    [21, "evening"],
    [22, "night"],
    [23, "night"],
  ])("puts %i:00 in the %s", (hour, part) => {
    expect(daypartOf(hour)).toBe(part);
  });
});

describe("daypartScript", () => {
  afterEach(() => jest.useRealTimers());

  it.each([3, 8, 13, 19, 23])(
    "stamps the same daypart as daypartOf at %i:00",
    (hour) => {
      jest.useFakeTimers({ now: new Date(2026, 9, 22, hour, 30) });
      const dataset: Record<string, string> = {};
      new Function("document", daypartScript)({
        documentElement: { dataset },
      });
      expect(dataset.daypart).toBe(daypartOf(hour));
    },
  );
});
