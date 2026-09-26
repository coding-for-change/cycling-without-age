import { prisma } from "@/lib/prisma";
import { rides } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    ride: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rideTrishaw: { findMany: jest.fn() },
    rideAssignment: { upsert: jest.fn(), delete: jest.fn() },
    rideRosterEntry: { upsert: jest.fn(), count: jest.fn(), delete: jest.fn() },
    $queryRaw: jest.fn(),
  };
  client.$transaction = jest.fn((run: (tx: unknown) => unknown) => run(client));
  return { prisma: client };
});

const db = prisma as unknown as {
  ride: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  rideTrishaw: { findMany: jest.Mock };
  rideAssignment: { upsert: jest.Mock; delete: jest.Mock };
  rideRosterEntry: { upsert: jest.Mock; count: jest.Mock; delete: jest.Mock };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

const CHAPTER = "chapter-muenchen";
const TRISHAW = "trishaw-1";

const base = {
  chapterId: CHAPTER,
  startsAt: new Date("2026-09-08T08:00:00Z"),
  endsAt: new Date("2026-09-08T10:00:00Z"),
};

const codeOf = async (run: Promise<unknown>) => {
  try {
    await run;
    return null;
  } catch (error) {
    return domainCode(error);
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  db.ride.create.mockResolvedValue({ id: "ride-new" });
  db.ride.update.mockResolvedValue({ id: "ride-new" });
  db.ride.findMany.mockResolvedValue([]);
  db.rideTrishaw.findMany.mockResolvedValue([]);
  db.$queryRaw.mockResolvedValue([]);
});

describe("scheduleRide", () => {
  it("rejects a ride that ends before it starts", async () => {
    await expect(
      rides.scheduleRide({
        ...base,
        endsAt: new Date("2026-09-08T07:00:00Z"),
      }),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("rejects a ride shorter than the minimum", async () => {
    await expect(
      rides.scheduleRide({
        ...base,
        endsAt: new Date("2026-09-08T08:05:00Z"),
      }),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("rejects a ride longer than a day's work", async () => {
    await expect(
      rides.scheduleRide({
        ...base,
        endsAt: new Date("2026-09-08T23:00:00Z"),
      }),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("schedules with no trishaw at all, asking the database nothing", async () => {
    await rides.scheduleRide(base);
    expect(db.rideTrishaw.findMany).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.ride.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trishaws: { create: [] } }),
      }),
    );
  });

  it("refuses a trishaw already reserved for an overlapping window", async () => {
    db.rideTrishaw.findMany.mockResolvedValue([
      { trishawId: TRISHAW, rideId: "ride-existing" },
    ]);
    expect(
      await codeOf(rides.scheduleRide({ ...base, trishawIds: [TRISHAW] })),
    ).toBe("trishawReserved");
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("reserves a free trishaw", async () => {
    await rides.scheduleRide({ ...base, trishawIds: [TRISHAW] });
    expect(db.ride.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trishaws: { create: [{ trishawId: TRISHAW }] },
        }),
      }),
    );
  });

  it("reserves several trishaws for one ride", async () => {
    await rides.scheduleRide({ ...base, trishawIds: [TRISHAW, "trishaw-2"] });
    expect(db.ride.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trishaws: {
            create: [{ trishawId: TRISHAW }, { trishawId: "trishaw-2" }],
          },
        }),
      }),
    );
  });

  it("refuses the same trishaw booked onto one ride twice", async () => {
    await expect(
      rides.scheduleRide({ ...base, trishawIds: [TRISHAW, TRISHAW] }),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("locks the trishaws and writes inside one transaction", async () => {
    await rides.scheduleRide({ ...base, trishawIds: [TRISHAW] });
    // The conflict check alone cannot stop a concurrent booking — the row lock
    // inside the same transaction is what serialises them.
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = String(db.$queryRaw.mock.calls[0][0].strings.join("?"));
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("trishaw");
  });

  it("does not write when the window was taken", async () => {
    db.rideTrishaw.findMany.mockResolvedValue([
      { trishawId: TRISHAW, rideId: "ride-existing" },
    ]);
    expect(
      await codeOf(rides.scheduleRide({ ...base, trishawIds: [TRISHAW] })),
    ).toBe("trishawReserved");
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("asks only about overlapping, non-cancelled rides", async () => {
    await rides.scheduleRide({ ...base, trishawIds: [TRISHAW] });
    expect(db.rideTrishaw.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          trishawId: { in: [TRISHAW] },
          ride: {
            status: { not: "cancelled" },
            startsAt: { lt: base.endsAt },
            endsAt: { gt: base.startsAt },
          },
        },
      }),
    );
  });
});

describe("rescheduleRide", () => {
  it("refuses a ride that is not there", async () => {
    db.ride.findUnique.mockResolvedValue(null);
    expect(await codeOf(rides.rescheduleRide("ride-1", base))).toBe(
      "unknownRide",
    );
  });

  it("ignores the ride's own reservations when checking for conflicts", async () => {
    db.ride.findUnique.mockResolvedValue({ id: "ride-1" });
    await rides.rescheduleRide("ride-1", { ...base, trishawIds: [TRISHAW] });
    expect(db.rideTrishaw.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ride: expect.objectContaining({ id: { not: "ride-1" } }),
        }),
      }),
    );
  });

  it("replaces the reservation set rather than adding to it", async () => {
    db.ride.findUnique.mockResolvedValue({ id: "ride-1" });
    await rides.rescheduleRide("ride-1", { ...base, trishawIds: [TRISHAW] });
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trishaws: { deleteMany: {}, create: [{ trishawId: TRISHAW }] },
        }),
      }),
    );
  });
});

describe("cancelRide", () => {
  it("keeps the ride on the calendar and records why", async () => {
    db.ride.findUnique.mockResolvedValue({ id: "ride-1" });
    await rides.cancelRide("ride-1", "  Weather  ");
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ride-1" },
        data: expect.objectContaining({
          status: "cancelled",
          cancellationReason: "Weather",
        }),
      }),
    );
  });

  it("stores no reason rather than an empty one", async () => {
    db.ride.findUnique.mockResolvedValue({ id: "ride-1" });
    await rides.cancelRide("ride-1", "   ");
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cancellationReason: null }),
      }),
    );
  });

  it("refuses a ride that is not there", async () => {
    db.ride.findUnique.mockResolvedValue(null);
    expect(await codeOf(rides.cancelRide("ride-1"))).toBe("unknownRide");
  });
});

describe("roster and staffing", () => {
  it("appends a rider to the end of the roster", async () => {
    db.ride.findUnique.mockResolvedValue({ id: "ride-1" });
    db.rideRosterEntry.count.mockResolvedValue(2);
    await rides.bookRider("ride-1", "passenger-1");
    expect(db.rideRosterEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { rideId: "ride-1", passengerId: "passenger-1", position: 2 },
      }),
    );
  });

  it("defaults a volunteer to the pilot role", async () => {
    db.ride.findUnique.mockResolvedValue({ id: "ride-1" });
    await rides.assignVolunteer("ride-1", "user-1");
    expect(db.rideAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { rideId: "ride-1", userId: "user-1", role: "pilot" },
      }),
    );
  });

  it("refuses to staff a ride that is not there", async () => {
    db.ride.findUnique.mockResolvedValue(null);
    expect(await codeOf(rides.assignVolunteer("ride-1", "user-1"))).toBe(
      "unknownRide",
    );
    expect(db.rideAssignment.upsert).not.toHaveBeenCalled();
  });
});

describe("empty scopes", () => {
  it("asks the database nothing when no chapter is in scope", async () => {
    expect(await rides.listRidesInRange([], new Date(), new Date())).toEqual(
      [],
    );
    expect(
      await rides.listRidesForPassengers([], new Date(), new Date()),
    ).toEqual([]);
    expect(db.ride.findMany).not.toHaveBeenCalled();
  });
});

describe("what a pilot may read", () => {
  it("requires current membership as well as the assignment", async () => {
    await rides.listRidesForPilot("user-1", new Date(), new Date());
    expect(db.ride.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignments: { some: { userId: "user-1" } },
          // Removing a member deletes the member row, not the assignment.
          chapter: { members: { some: { userId: "user-1" } } },
        }),
      }),
    );
  });
});

/**
 * The RFP's contact-detail exchange is between the rider and the pilot matched
 * to them — not between riders who happen to share a trishaw.
 */
describe("who may read a rider's name", () => {
  const FROM = new Date("2026-09-08T00:00:00Z");
  const TO = new Date("2026-09-15T00:00:00Z");
  const selectOf = () => db.ride.findMany.mock.calls[0][0].select;

  it("gives the assigned pilot the names on their own rides", async () => {
    await rides.listRidesForPilot("user-1", FROM, TO);
    expect(selectOf().roster).toBeDefined();
  });

  // Two riders on one ride are managed by two different people.
  it("gives the passenger agenda a count and no names", async () => {
    await rides.listRidesForPassengers(["passenger-1"], FROM, TO);
    expect(selectOf().roster).toBeUndefined();
    expect(selectOf()._count).toEqual({ select: { roster: true } });
  });

  it("gives the admin calendar a count and no names", async () => {
    await rides.listRidesInRange(["chapter-muenchen"], FROM, TO);
    expect(selectOf().roster).toBeUndefined();
  });

  // A feed leaves the app for someone else's calendar servers.
  it("gives a calendar feed nobody's name, not even a count", async () => {
    await rides.listRidesForCalendarFeed(
      "user-1",
      { pilotChapterIds: [], passengerIds: ["passenger-1"] },
      FROM,
      TO,
      FROM,
    );
    const select = selectOf();
    expect(select.roster).toBeUndefined();
    expect(select._count).toBeUndefined();
    expect(select.chapter).toEqual({ select: { name: true } });
    expect(select.assignments).toEqual({
      where: { userId: "user-1" },
      select: { role: true },
    });
  });
});

describe("what a calendar feed may read", () => {
  const FROM = new Date("2026-06-25T00:00:00Z");
  const NOW = new Date("2026-09-23T10:00:00Z");
  const TO = new Date("2027-10-28T00:00:00Z");
  const call = (n: number) => db.ride.findMany.mock.calls[n][0];
  const piloting = {
    assignments: { some: { userId: "user-1" } },
    chapterId: { in: [CHAPTER] },
  };
  const riding = { roster: { some: { passengerId: { in: ["passenger-1"] } } } };
  const both = { pilotChapterIds: [CHAPTER], passengerIds: ["passenger-1"] };
  const rows = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}` }));

  it("is the pilot's rule or the rider's, never either widened", async () => {
    await rides.listRidesForCalendarFeed("user-1", both, FROM, TO, NOW);
    expect(call(0).where).toEqual({
      startsAt: { lt: TO },
      endsAt: { gt: NOW },
      OR: [piloting, riding],
    });
  });

  it("drops a branch the reader has no standing in", async () => {
    await rides.listRidesForCalendarFeed(
      "user-1",
      { pilotChapterIds: [], passengerIds: ["passenger-1"] },
      FROM,
      TO,
      NOW,
    );
    expect(call(0).where.OR).toEqual([riding]);
  });

  // An empty `OR` would match every ride in the window.
  it("asks the database nothing for a reader with no standing at all", async () => {
    expect(
      await rides.listRidesForCalendarFeed(
        "user-1",
        { pilotChapterIds: [], passengerIds: [] },
        FROM,
        TO,
        NOW,
      ),
    ).toEqual([]);
    expect(db.ride.findMany).not.toHaveBeenCalled();
  });

  it("fills the rest with the past, newest first, and never twice", async () => {
    db.ride.findMany
      .mockResolvedValueOnce(rows("ahead", 2))
      .mockResolvedValueOnce([{ id: "behind-new" }, { id: "behind-old" }]);
    const list = await rides.listRidesForCalendarFeed(
      "user-1",
      both,
      FROM,
      TO,
      NOW,
    );
    expect(call(0)).toEqual(
      expect.objectContaining({
        take: rides.FEED_MAX_RIDES,
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      }),
    );
    // A ride still running at `now` belongs to the first slice only.
    expect(call(1)).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          startsAt: { lt: NOW },
          endsAt: { gt: FROM, lte: NOW },
        }),
        take: rides.FEED_MAX_RIDES - 2,
        orderBy: [{ startsAt: "desc" }, { id: "desc" }],
      }),
    );
    expect(list.map((ride) => ride.id)).toEqual([
      "behind-old",
      "behind-new",
      "ahead-0",
      "ahead-1",
    ]);
  });

  // A care home with fifty residents must not lose next week to last spring.
  it("keeps what is coming up when the cap is reached", async () => {
    db.ride.findMany.mockResolvedValueOnce(rows("ahead", rides.FEED_MAX_RIDES));
    const list = await rides.listRidesForCalendarFeed(
      "user-1",
      both,
      FROM,
      TO,
      NOW,
    );
    expect(list).toHaveLength(rides.FEED_MAX_RIDES);
    expect(db.ride.findMany).toHaveBeenCalledTimes(1);
  });
});
