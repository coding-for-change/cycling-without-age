import { pickHour, weatherKind } from "./weather";

describe("weatherKind", () => {
  it("folds WMO codes into what a passenger cares about", () => {
    expect(weatherKind(0)).toBe("clear");
    expect(weatherKind(2)).toBe("partlyCloudy");
    expect(weatherKind(3)).toBe("cloudy");
    expect(weatherKind(45)).toBe("fog");
    expect(weatherKind(53)).toBe("drizzle");
    expect(weatherKind(63)).toBe("rain");
    expect(weatherKind(81)).toBe("rain");
    expect(weatherKind(73)).toBe("snow");
    expect(weatherKind(95)).toBe("thunder");
  });
});

describe("pickHour", () => {
  const hourly = {
    time: ["2026-10-20T12:00", "2026-10-20T13:00", "2026-10-20T14:00"],
    temperature_2m: [15.4, 17.6, 18.2],
    weather_code: [3, 1, 0],
  };

  it("reads the hour closest to the ride", () => {
    expect(pickHour(hourly, new Date("2026-10-20T13:20:00Z"))).toEqual({
      kind: "partlyCloudy",
      celsius: 18,
    });
  });

  it("says nothing for an hour the answer does not cover", () => {
    expect(pickHour(hourly, new Date("2026-10-20T20:00:00Z"))).toBeNull();
  });
});
