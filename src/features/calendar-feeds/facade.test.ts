import { Prisma } from "@/generated/prisma";
import { calendarFeeds } from "@/features/calendar-feeds";
import { feedToken } from "@/lib/crypto/feed-signature";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    calendarFeed: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/observability/logger", () => ({
  logDomainEvent: jest.fn(),
}));

const db = prisma as unknown as {
  calendarFeed: {
    findUnique: jest.Mock;
    create: jest.Mock;
    upsert: jest.Mock;
    deleteMany: jest.Mock;
    updateMany: jest.Mock;
  };
};

const KEY = "AAAAAAAAAAAAAAAAAAAAAA";
const NOW = new Date("2026-09-23T10:00:00Z");

const row = (over: Record<string, unknown> = {}) => ({
  id: "feed-1",
  key: KEY,
  lastFetchedAt: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  ...over,
});

const opened = (user: Record<string, unknown> = {}) =>
  db.calendarFeed.findUnique.mockResolvedValue({
    id: "feed-1",
    userId: "user-1",
    user: { locale: "de", banned: false, banExpires: null, ...user },
  });

const ORIGINAL = process.env.BETTER_AUTH_SECRET;

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = "facade-test-secret";
});

afterAll(() => {
  process.env.BETTER_AUTH_SECRET = ORIGINAL;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("enableFeed", () => {
  it("hands back the address already issued rather than a second one", async () => {
    db.calendarFeed.findUnique.mockResolvedValue(row());
    const feed = await calendarFeeds.enableFeed("user-1");
    expect(feed.token).toBe(feedToken(KEY));
    expect(db.calendarFeed.create).not.toHaveBeenCalled();
  });

  it("mints a fresh random key the first time", async () => {
    db.calendarFeed.findUnique.mockResolvedValue(null);
    db.calendarFeed.create.mockImplementation(({ data }) =>
      Promise.resolve(row({ key: data.key })),
    );
    const feed = await calendarFeeds.enableFeed("user-1");
    const { data } = db.calendarFeed.create.mock.calls[0][0];
    expect(data.userId).toBe("user-1");
    expect(data.key).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(feed.token).toBe(feedToken(data.key));
  });

  it("settles a double click on whichever row won", async () => {
    db.calendarFeed.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(row());
    db.calendarFeed.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const feed = await calendarFeeds.enableFeed("user-1");
    expect(feed.token).toBe(feedToken(KEY));
  });
});

describe("resetFeed", () => {
  it("replaces the key and forgets when the old one was last fetched", async () => {
    db.calendarFeed.upsert.mockImplementation(({ update }) =>
      Promise.resolve(row({ key: update.key })),
    );
    const feed = await calendarFeeds.resetFeed("user-1");
    const { update } = db.calendarFeed.upsert.mock.calls[0][0];
    expect(update.key).not.toBe(KEY);
    expect(update.lastFetchedAt).toBeNull();
    expect(feed.token).toBe(feedToken(update.key));
  });
});

describe("openFeed", () => {
  it("opens a genuine address", async () => {
    opened();
    expect(await calendarFeeds.openFeed(feedToken(KEY), NOW)).toEqual({
      id: "feed-1",
      userId: "user-1",
      locale: "de",
    });
    expect(db.calendarFeed.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: KEY } }),
    );
  });

  it("reads nothing for a forged signature", async () => {
    const [, signature] = feedToken("BBBBBBBBBBBBBBBBBBBBBB").split(".");
    expect(await calendarFeeds.openFeed(`${KEY}.${signature}`, NOW)).toBeNull();
    expect(db.calendarFeed.findUnique).not.toHaveBeenCalled();
  });

  it("reads nothing for the bare key", async () => {
    expect(await calendarFeeds.openFeed(KEY, NOW)).toBeNull();
    expect(db.calendarFeed.findUnique).not.toHaveBeenCalled();
  });

  it("opens nothing once the key has been replaced or turned off", async () => {
    db.calendarFeed.findUnique.mockResolvedValue(null);
    expect(await calendarFeeds.openFeed(feedToken(KEY), NOW)).toBeNull();
  });

  it("opens nothing for a banned account", async () => {
    opened({ banned: true });
    expect(await calendarFeeds.openFeed(feedToken(KEY), NOW)).toBeNull();
  });

  it("opens again once a ban has run out", async () => {
    opened({ banned: true, banExpires: new Date("2026-09-01T00:00:00Z") });
    expect(await calendarFeeds.openFeed(feedToken(KEY), NOW)).not.toBeNull();
  });
});

describe("recordFetch", () => {
  it("writes at most once a quarter hour", async () => {
    await calendarFeeds.recordFetch("feed-1", NOW);
    expect(db.calendarFeed.updateMany).toHaveBeenCalledWith({
      where: {
        id: "feed-1",
        OR: [
          { lastFetchedAt: null },
          { lastFetchedAt: { lt: new Date("2026-09-23T09:45:00Z") } },
        ],
      },
      data: { lastFetchedAt: NOW },
    });
  });
});
