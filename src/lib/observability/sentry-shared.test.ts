import {
  beforeSend,
  beforeSendLog,
  isUntraced,
  scrubUrl,
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
