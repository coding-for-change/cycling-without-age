import { prisma } from "@/lib/prisma";
import { rides } from "@/features/rides";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    ride: { findMany: jest.fn(), findFirst: jest.fn() },
    rideLogEntry: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    passenger: { findMany: jest.fn() },
  },
}));

const findMany = prisma.ride.findMany as jest.Mock;
const findFirst = prisma.ride.findFirst as jest.Mock;
const now = new Date("2026-10-13T10:00:00Z");
const MINE = ["p-anna", "p-karl"];

const ride = (id: string, startsAt: string) => ({
  id,
  chapterId: "ch-muenchen",
  startsAt: new Date(startsAt),
  assignments: [],
});

beforeEach(() => {
  jest.clearAllMocks();
  findMany.mockResolvedValue([]);
});

describe("listPassengerRidesPage", () => {
  it("asks nothing when there are no riders to ask for", async () => {
    await expect(
      rides.listPassengerRidesPage([], { direction: "upcoming" }, now),
    ).resolves.toEqual({ rides: [], nextCursor: null });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("only reads rides one of these riders is booked on, and only their names", async () => {
    await rides.listPassengerRidesPage(MINE, { direction: "upcoming" }, now);
    const query = findMany.mock.calls[0][0];
    expect(query.where.roster).toEqual({
      some: { passengerId: { in: MINE } },
    });
    expect(query.select.roster.where).toEqual({ passengerId: { in: MINE } });
    expect(query.where.endsAt).toEqual({ gt: now });
    expect(query.orderBy).toEqual([{ startsAt: "asc" }, { id: "asc" }]);
  });

  it("pages forward with a cursor when there is more", async () => {
    findMany.mockResolvedValue([
      ride("r-1", "2026-10-14T08:00:00Z"),
      ride("r-2", "2026-10-15T08:00:00Z"),
      ride("r-3", "2026-10-16T08:00:00Z"),
    ]);
    const page = await rides.listPassengerRidesPage(
      MINE,
      { direction: "upcoming", limit: 2 },
      now,
    );
    expect(page.rides.map((r) => r.id)).toEqual(["r-1", "r-2"]);
    expect(page.nextCursor).toBe(
      `${new Date("2026-10-15T08:00:00Z").getTime()}.r-2`,
    );
    expect(findMany.mock.calls[0][0].take).toBe(3);

    await rides.listPassengerRidesPage(
      MINE,
      { direction: "upcoming", cursor: page.nextCursor, limit: 2 },
      now,
    );
    expect(findMany.mock.calls[1][0].where.OR).toEqual([
      { startsAt: { gt: new Date("2026-10-15T08:00:00Z") } },
      { startsAt: new Date("2026-10-15T08:00:00Z"), id: { gt: "r-2" } },
    ]);
  });

  it("pages the past backwards, latest first", async () => {
    const cursor = `${new Date("2026-10-01T08:00:00Z").getTime()}.r-9`;
    await rides.listPassengerRidesPage(
      MINE,
      { direction: "past", cursor },
      now,
    );
    const query = findMany.mock.calls[0][0];
    expect(query.where.endsAt).toEqual({ lte: now });
    expect(query.orderBy).toEqual([{ startsAt: "desc" }, { id: "desc" }]);
    expect(query.where.OR).toEqual([
      { startsAt: { lt: new Date("2026-10-01T08:00:00Z") } },
      { startsAt: new Date("2026-10-01T08:00:00Z"), id: { lt: "r-9" } },
    ]);
    expect(query.where.roster).toEqual({
      some: { passengerId: { in: MINE } },
    });
  });

  it("treats a forged cursor as the first page", async () => {
    await rides.listPassengerRidesPage(
      MINE,
      { direction: "upcoming", cursor: "1; DROP TABLE ride" },
      now,
    );
    expect(findMany.mock.calls[0][0].where.OR).toBeUndefined();
  });
});

const pilot = (id: string, chapterIds: string[]) => ({
  role: "pilot",
  user: {
    id,
    name: id,
    email: `${id}@cwa.local`,
    members: chapterIds.map((organizationId) => ({ organizationId })),
  },
});

describe("pilots who left the chapter", () => {
  it("are left out of a page of rides", async () => {
    findMany.mockResolvedValue([
      {
        ...ride("r-1", "2026-10-14T08:00:00Z"),
        chapterId: "ch-muenchen",
        assignments: [
          pilot("u-current", ["ch-muenchen"]),
          pilot("u-gone", ["ch-hamburg"]),
        ],
      },
    ]);
    const page = await rides.listPassengerRidesPage(
      MINE,
      { direction: "upcoming" },
      now,
    );
    expect(page.rides[0].assignments.map((a) => a.user.id)).toEqual([
      "u-current",
    ]);
  });
});

describe("getRideWithStoryForPassengers", () => {
  const findLog = prisma.rideLogEntry.findMany as jest.Mock;

  it("reads the ride only through the riders' own bookings", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      rides.getRideWithStoryForPassengers("r-1", MINE, "user-1"),
    ).resolves.toBeNull();
    const query = findFirst.mock.calls[0][0];
    expect(query.where).toEqual({
      id: "r-1",
      roster: { some: { passengerId: { in: MINE } } },
    });
    expect(query.select.roster.where).toEqual({ passengerId: { in: MINE } });
    expect(query.select.returnLeg.select.roster.where).toEqual({
      passengerId: { in: MINE },
    });
  });

  it("never reads the history of a ride the riders are not on", async () => {
    findFirst.mockResolvedValue(null);
    await rides.getRideWithStoryForPassengers("r-1", MINE, "user-1");
    expect(findLog).not.toHaveBeenCalled();
  });

  it("never shows a pilot's address", async () => {
    findFirst.mockResolvedValue(null);
    await rides.getRideWithStoryForPassengers("r-1", MINE, "user-1");
    const user = findFirst.mock.calls[0][0].select.assignments.select.user;
    expect(user.select).toEqual({
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      members: { select: { organizationId: true } },
    });
  });

  it("hands over the ride and its story, without pilots who left", async () => {
    findFirst.mockResolvedValue({
      id: "r-1",
      chapterId: "ch-muenchen",
      assignments: [pilot("u-current", ["ch-muenchen"]), pilot("u-gone", [])],
    });
    findLog.mockResolvedValue([
      {
        id: "l-1",
        type: "note",
        payload: { text: "internal" },
        createdAt: now,
        actor: null,
      },
      {
        id: "l-2",
        type: "scheduled",
        payload: {},
        createdAt: now,
        actor: null,
      },
    ]);
    const view = await rides.getRideWithStoryForPassengers(
      "r-1",
      MINE,
      "user-1",
    );
    expect(view?.ride.assignments.map((a) => a.user.id)).toEqual(["u-current"]);
    expect(view?.story.map((entry) => entry.id)).toEqual(["l-2"]);
  });

  it("asks nothing for someone with no riders", async () => {
    await expect(
      rides.getRideWithStoryForPassengers("r-1", [], "user-1"),
    ).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
