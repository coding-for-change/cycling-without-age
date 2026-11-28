import { GET } from "./route";

const queryRaw = jest.fn();

jest.mock("next/server", () => ({ connection: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: () => queryRaw() },
}));
jest.mock("@/lib/realtime", () => ({
  commandClient: () => ({ ping: jest.fn().mockResolvedValue("PONG") }),
}));

describe("GET /api/health", () => {
  beforeEach(() => queryRaw.mockResolvedValue([{ "?column?": 1 }]));

  it("lets the native offline page read a healthy answer from any origin", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 503 when the database is down, so the offline page keeps waiting", async () => {
    queryRaw.mockRejectedValue(new Error("down"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });
});
