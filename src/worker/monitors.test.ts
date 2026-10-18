import { MAINTENANCE_NAMES, MONITORS, schedulerOptions } from "./monitors";

describe("worker monitors", () => {
  it("runs these maintenance jobs", () => {
    expect(MAINTENANCE_NAMES).toEqual([
      "sweep",
      "ride-sweep",
      "prune-devices",
      "prune-chat",
    ]);
  });

  it("sweeps upcoming rides every five minutes", () => {
    expect(MONITORS["ride-sweep"].schedule).toEqual({
      type: "interval",
      value: 5,
      unit: "minute",
    });
    expect(schedulerOptions("ride-sweep")).toEqual({
      every: 5 * 60_000,
      tz: "UTC",
    });
  });
});
