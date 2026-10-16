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
  startsAt: new Date(startsAt),
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

describe("getRideForPassengers", () => {
  it("reads the ride only through the riders' own bookings", async () => {
    findFirst.mockResolvedValue(null);
    await expect(rides.getRideForPassengers("r-1", MINE)).resolves.toBeNull();
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

  it("never shows a pilot's address", async () => {
    findFirst.mockResolvedValue(null);
    await rides.getRideForPassengers("r-1", MINE);
    const pilot = findFirst.mock.calls[0][0].select.assignments.select.user;
    expect(pilot.select).toEqual({
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
    });
  });

  it("asks nothing for someone with no riders", async () => {
    await expect(rides.getRideForPassengers("r-1", [])).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
