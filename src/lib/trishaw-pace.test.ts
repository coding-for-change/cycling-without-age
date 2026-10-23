import { TRISHAW_SLOWDOWN, trishawRoute, trishawSeconds } from "./trishaw-pace";

describe("trishawSeconds", () => {
  it("stretches a cycling time by the trishaw slowdown", () => {
    expect(TRISHAW_SLOWDOWN).toBe(1.5);
    expect(trishawSeconds(600)).toBe(900);
    expect(trishawSeconds(101)).toBe(152);
  });
});

describe("trishawRoute", () => {
  it("turns a cycling route into a trishaw one, leaving the rest alone", () => {
    const path: [number, number][] = [[11.57, 48.13]];
    expect(trishawRoute({ path, distanceM: 4200, durationSec: 900 })).toEqual({
      path,
      distanceM: 4200,
      durationSec: 1350,
    });
  });

  it("passes a missing route through", () => {
    expect(trishawRoute(null)).toBeNull();
  });
});
