import { withinRateLimit } from "./rate-limit";

const limit = { max: 3, windowMs: 1000 };

describe("withinRateLimit", () => {
  it("allows up to the cap and then refuses", () => {
    const key = `a-${Math.random()}`;
    expect([1, 2, 3].map(() => withinRateLimit(key, limit))).toEqual([
      true,
      true,
      true,
    ]);
    expect(withinRateLimit(key, limit)).toBe(false);
  });

  it("keeps keys apart, so one caller cannot exhaust another's budget", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 3; i++) withinRateLimit(a, limit);
    expect(withinRateLimit(a, limit)).toBe(false);
    expect(withinRateLimit(b, limit)).toBe(true);
  });

  it("lets the window slide", () => {
    jest.useFakeTimers().setSystemTime(0);
    const key = `c-${Math.random()}`;
    for (let i = 0; i < 3; i++) withinRateLimit(key, limit);
    expect(withinRateLimit(key, limit)).toBe(false);
    jest.setSystemTime(1500);
    expect(withinRateLimit(key, limit)).toBe(true);
    jest.useRealTimers();
  });
});
