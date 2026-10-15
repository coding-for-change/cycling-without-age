import {
  beforeSend,
  beforeSendLog,
  isUntraced,
  scrubUrl,
  SERVER_ACTION_TRACE_RATE,
  tracesSampler,
} from "./sentry-shared";

const TOKEN = "AAAAAAAAAAAAAAAAAAAAAA.BBBBBBBBBBBBBBBBBBBBBB";
const FEED = `https://cwa.example/api/calendar/${TOKEN}.ics`;

describe("calendar feed addresses", () => {
  it("are never traced", () => {
    expect(isUntraced("/api/calendar/abc.def.ics")).toBe(true);
    expect(isUntraced("GET /api/calendar/[file]")).toBe(true);
  });

  it("lose their token before an error event leaves", () => {
    expect(scrubUrl(FEED)).toBe("https://cwa.example/api/calendar/[token]");
    const event = beforeSend({
      type: undefined,
      request: { url: `${FEED}?x=1`, method: "GET" },
    });
    expect(event?.request?.url).toBe(
      "https://cwa.example/api/calendar/[token]",
    );
  });

  // `captureRequestError` copies the raw path into a context of its own.
  it("lose their token from every context and message an error carries", () => {
    const event = beforeSend({
      type: undefined,
      message: `GET /api/calendar/${TOKEN}.ics failed`,
      contexts: { nextjs: { request_path: `/api/calendar/${TOKEN}.ics` } },
    });
    expect(JSON.stringify(event)).not.toContain(TOKEN);
    expect(event?.contexts?.nextjs?.request_path).toBe("/api/calendar/[token]");
  });

  it("lose their token from log lines", () => {
    const log = beforeSendLog({
      level: "error",
      message: `poll of ${FEED} failed`,
      attributes: { path: `/api/calendar/${TOKEN}.ics` },
    });
    expect(JSON.stringify(log)).not.toContain(TOKEN);
  });

  it("leave every other url as it was, minus the query", () => {
    expect(scrubUrl("https://cwa.example/pilot?week=2026-09-21")).toBe(
      "https://cwa.example/pilot",
    );
  });
});

describe("tracesSampler", () => {
  const sample = (
    context: Partial<Parameters<typeof tracesSampler>[0]> & { name: string },
  ) => {
    const inheritOrSampleWith = jest.fn((rate: number) => rate);
    const rate = tracesSampler({ inheritOrSampleWith, ...context });
    return { rate, inheritOrSampleWith };
  };

  it("drops redis commands that start a trace of their own", () => {
    expect(
      sample({
        name: "redis-evalsha",
        attributes: { "sentry.op": "db.redis" },
      }).rate,
    ).toBe(0);
    expect(
      sample({
        name: "redis-connect",
        attributes: { "sentry.op": "db.redis.connect" },
      }).rate,
    ).toBe(0);
  });

  it("leaves database spans inside a sampled trace to the parent", () => {
    const { rate, inheritOrSampleWith } = sample({
      name: "redis-get",
      parentSampled: true,
      attributes: { "sentry.op": "db.redis" },
    });
    expect(inheritOrSampleWith).toHaveBeenCalled();
    expect(rate).toBeGreaterThan(0);
  });

  it("drops untraced routes by target or by name", () => {
    expect(
      sample({
        name: "GET /api/health",
        attributes: { "http.target": "/api/health" },
      }).rate,
    ).toBe(0);
    expect(sample({ name: "GET /metrics" }).rate).toBe(0);
    expect(
      sample({
        name: "GET /monitoring",
        attributes: { "http.route": "/pilot" },
      }).rate,
    ).toBe(0);
  });

  it("samples server actions at their own rate", () => {
    expect(
      sample({
        name: "serverAction/bookRide",
        attributes: { "sentry.op": "function.server_action" },
      }).rate,
    ).toBe(SERVER_ACTION_TRACE_RATE);
  });

  it("inherits or falls back to the default rate for everything else", () => {
    const { inheritOrSampleWith } = sample({
      name: "GET /pilot",
      attributes: { "http.target": "/pilot" },
    });
    expect(inheritOrSampleWith).toHaveBeenCalledWith(0.2);
  });
});
