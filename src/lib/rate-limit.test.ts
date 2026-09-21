import { web } from "@/lib/observability/metrics";
import { withinRateLimit } from "./rate-limit";

jest.mock("@/lib/observability/metrics", () => ({
  web: { rateLimitHits: { inc: jest.fn() } },
}));

const hits = web.rateLimitHits.inc as unknown as jest.Mock;

beforeEach(() => jest.clearAllMocks());

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

  it("counts a refusal under the key's scope, never the caller's id", () => {
    const key = `chat-send:user-${Math.random()}`;
    for (let i = 0; i < 3; i++) withinRateLimit(key, limit);
    expect(hits).not.toHaveBeenCalled();

    expect(withinRateLimit(key, limit)).toBe(false);
    expect(hits).toHaveBeenCalledWith({ scope: "chat-send" });
  });

  it("uses the whole key as the scope when it carries no colon", () => {
    const key = `plain-${Math.random()}`;
    for (let i = 0; i < 3; i++) withinRateLimit(key, limit);
    withinRateLimit(key, limit);

    expect(hits).toHaveBeenCalledWith({ scope: key });
  });
});
