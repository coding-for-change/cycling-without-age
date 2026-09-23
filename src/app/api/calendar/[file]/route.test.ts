import { feedToken, newFeedKey } from "@/lib/crypto/feed-signature";
import { renderCalendarFeed } from "@/use-cases/calendar-feed";
import { GET } from "./route";

jest.mock("next/server", () => ({ connection: jest.fn() }));
jest.mock("@/use-cases/calendar-feed", () => ({
  renderCalendarFeed: jest.fn(),
}));

const render = renderCalendarFeed as jest.Mock;

process.env.BETTER_AUTH_SECRET = "route-test-secret";

const TOKEN = feedToken(newFeedKey());
const BODY = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";

const call = (file: string, headers: Record<string, string> = {}) =>
  GET(new Request(`https://cwa.example/api/calendar/${file}`, { headers }), {
    params: Promise.resolve({ file }),
  });

beforeEach(() => {
  jest.clearAllMocks();
  render.mockResolvedValue(BODY);
});

describe("GET /api/calendar/[file]", () => {
  it("serves the feed as a private text/calendar", async () => {
    const response = await call(`${TOKEN}.ics`);
    expect(response.status).toBe(200);
    expect(render).toHaveBeenCalledWith(TOKEN);
    expect(await response.text()).toBe(BODY);
    expect(response.headers.get("content-type")).toBe(
      "text/calendar; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("etag")).toMatch(/^"[\w-]+"$/);
  });

  it("is a plain 404 for an address that opens nothing", async () => {
    render.mockResolvedValue(null);
    const response = await call(`${TOKEN}.ics`);
    expect(response.status).toBe(404);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("turns a forged address away before the limiter or the use case", async () => {
    const [key] = feedToken(newFeedKey()).split(".");
    const forged = `${key}.BBBBBBBBBBBBBBBBBBBBBB`;
    for (let i = 0; i < 80; i += 1)
      expect((await call(`${forged}.ics`)).status).toBe(404);
    expect(render).not.toHaveBeenCalled();
  });

  it("never asks the use case about a name that is not an .ics file", async () => {
    const response = await call(TOKEN);
    expect(response.status).toBe(404);
    expect(render).not.toHaveBeenCalled();
  });

  it("answers an unchanged feed with 304", async () => {
    const first = await call(`${TOKEN}.ics`);
    const etag = first.headers.get("etag")!;
    const again = await call(`${TOKEN}.ics`, { "if-none-match": `W/${etag}` });
    expect(again.status).toBe(304);
    expect(await again.text()).toBe("");
  });

  it("slows down a runaway poller", async () => {
    const token = feedToken(newFeedKey());
    for (let i = 0; i < 60; i += 1) await call(`${token}.ics`);
    const response = await call(`${token}.ics`);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("600");
  });
});
