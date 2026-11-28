import { GET } from "./route";

jest.mock("next/server", () => ({ connection: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) },
}));
jest.mock("@/lib/realtime", () => ({
  commandClient: () => ({ ping: jest.fn().mockResolvedValue("PONG") }),
}));

const call = (origin?: string) =>
  GET(
    new Request("https://cwa.example/api/health", {
      headers: origin ? { origin } : {},
    }),
  );

describe("GET /api/health", () => {
  it.each(["capacitor://localhost", "https://localhost"])(
    "lets the native offline page at %s read the answer",
    async (origin) => {
      const response = await call(origin);
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
      expect(response.headers.get("vary")).toBe("Origin");
    },
  );

  it.each(["https://evil.example", "http://localhost", "capacitor://evil"])(
    "keeps the answer from any other origin (%s)",
    async (origin) => {
      const response = await call(origin);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect(
        response.headers.get("access-control-allow-credentials"),
      ).toBeNull();
    },
  );

  it("answers same-origin probes without CORS headers", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
