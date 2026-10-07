import { prisma } from "@/lib/prisma";
import { rideInput, rides, type RideInput } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import { transaction } from "@/lib/events";
import { Prisma } from "@/generated/prisma";

const emitted: { type: string }[] = [];

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    ride: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rideTrishaw: { findMany: jest.fn() },
    rideAssignment: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    rideRosterEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    storedFile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    rideLogEntry: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: { findMany: jest.fn() },
    passenger: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  client.$transaction = jest.fn((run: (tx: unknown) => unknown) => run(client));
  return { prisma: client };
});

jest.mock("@/lib/events", () => {
  const { prisma: client } = jest.requireMock("@/lib/prisma");
  return {
    transaction: jest.fn((run: (tx: unknown, emit: unknown) => unknown) =>
      client.$transaction((tx: unknown) =>
        run(tx, async (event: { type: string }) => {
          emitted.push(event);
        }),
      ),
    ),
  };
});

const db = prisma as unknown as {
  ride: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  rideTrishaw: { findMany: jest.Mock };
  rideAssignment: {
    findMany: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  rideRosterEntry: {
    findMany: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  storedFile: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  rideLogEntry: {
    create: jest.Mock;
    createMany: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  user: { findMany: jest.Mock };
  passenger: { findMany: jest.Mock };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

const CHAPTER = "chapter-muenchen";
const TRISHAW = "trishaw-1";
const ADMIN = "user-admin";

const base = {
  chapterId: CHAPTER,
  title: "Sommerfest",
  capacity: 10,
  startsAt: new Date("2026-09-08T08:00:00Z"),
  endsAt: new Date("2026-09-08T10:00:00Z"),
};

const scheduled = (overrides: Record<string, unknown> = {}) => ({
  id: "ride-1",
  chapterId: CHAPTER,
  model: "event",
  status: "scheduled",
  startsAt: base.startsAt,
  endsAt: base.endsAt,
  locationName: "Sonnenhof",
  locationAddress: null,
  latitude: null,
  longitude: null,
  destinationName: null,
  destinationAddress: null,
  destinationLatitude: null,
  destinationLongitude: null,
  requiredPilots: 1,
  capacity: null,
  note: null,
  trishaws: [],
  assignments: [],
  roster: [],
  photos: [],
  returnLeg: null,
  returnLegOf: null,
  chapter: { id: CHAPTER, name: "München", timeZone: "Europe/Berlin" },
  ...overrides,
});

const codeOf = async (run: Promise<unknown>) => {
  try {
    await run;
    return null;
  } catch (error) {
    return domainCode(error);
  }
};

const logTypes = () =>
  [
    ...db.rideLogEntry.create.mock.calls.map(([args]) => [args.data]),
    ...db.rideLogEntry.createMany.mock.calls.map(([args]) => args.data),
  ]
    .flat()
    .map((data: { type: string }) => data.type);

const schedule = async (input: RideInput, actorUserId: string | null) =>
  rides.scheduleRide(rideInput.parse(input), actorUserId);
const eventTypes = () => emitted.map((event) => event.type);
const lockedSql = () =>
  db.$queryRaw.mock.calls.map(([sql]) => String(sql.strings.join("?")));

beforeEach(() => {
  jest.clearAllMocks();
  emitted.length = 0;
  let created = 0;
  db.ride.create.mockImplementation(({ data }) =>
    Promise.resolve({
      id: `ride-new-${++created}`,
      chapterId: data.chapterId,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      trishaws: [],
    }),
  );
  db.ride.update.mockResolvedValue(scheduled());
  db.ride.findMany.mockResolvedValue([]);
  db.rideTrishaw.findMany.mockResolvedValue([]);
  db.rideLogEntry.create.mockResolvedValue({ id: "log-1" });
  db.$queryRaw.mockResolvedValue([]);
});

describe("scheduleRide", () => {
  it("rejects a ride that ends before it starts", async () => {
    await expect(
      schedule({ ...base, endsAt: new Date("2026-09-08T07:00:00Z") }, ADMIN),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("rejects a ride shorter than the minimum", async () => {
    await expect(
      schedule({ ...base, endsAt: new Date("2026-09-08T08:05:00Z") }, ADMIN),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("rejects a ride longer than a day's work", async () => {
    await expect(
      schedule({ ...base, endsAt: new Date("2026-09-08T23:00:00Z") }, ADMIN),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("schedules with no trishaw at all, asking the database nothing", async () => {
    await schedule(base, ADMIN);
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
      await codeOf(schedule({ ...base, trishawIds: [TRISHAW] }, ADMIN)),
    ).toBe("trishawReserved");
    expect(db.ride.create).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("reserves several trishaws for one ride", async () => {
    await schedule({ ...base, trishawIds: [TRISHAW, "trishaw-2"] }, ADMIN);
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
      schedule({ ...base, trishawIds: [TRISHAW, TRISHAW] }, ADMIN),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("locks the trishaws and writes inside one transaction", async () => {
    await schedule({ ...base, trishawIds: [TRISHAW] }, ADMIN);
    // The conflict check alone cannot stop a concurrent booking — the row lock
    // inside the same transaction as the write is what serialises them.
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    const sql = String(db.$queryRaw.mock.calls[0][0].strings.join("?"));
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("trishaw");
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.ride.create.mock.invocationCallOrder[0],
    );
  });

  it("gives a ride that is not functional no destination", async () => {
    await schedule(
      { ...base, model: "event", destinationName: "Dr. Weber" },
      ADMIN,
    );
    expect(db.ride.create.mock.calls[0][0].data.destinationName).toBeNull();
  });

  it("asks only about overlapping, non-cancelled rides", async () => {
    await schedule({ ...base, trishawIds: [TRISHAW] }, ADMIN);
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

  it("writes one log row and emits one event", async () => {
    await schedule(base, ADMIN);
    expect(logTypes()).toEqual(["scheduled"]);
    expect(emitted).toEqual([
      {
        type: "ride.scheduled",
        rideId: "ride-new-1",
        chapterId: CHAPTER,
        actorUserId: ADMIN,
        returnLegId: null,
      },
    ]);
  });

  describe("a round trip", () => {
    const back = {
      startsAt: new Date("2026-09-08T11:00:00Z"),
      endsAt: new Date("2026-09-08T13:00:00Z"),
    };
    const trip = {
      ...base,
      model: "functional" as const,
      locationName: "Sonnenhof",
      destinationName: "Dr. Weber",
      trishawIds: [TRISHAW],
      returnLeg: back,
    };

    it("is two rides, the way back mirrored and linked to the way there", async () => {
      const ride = await schedule(trip, ADMIN);
      expect(db.ride.create).toHaveBeenCalledTimes(2);
      expect(db.ride.create.mock.calls[1][0].data).toEqual(
        expect.objectContaining({
          startsAt: back.startsAt,
          endsAt: back.endsAt,
          locationName: "Dr. Weber",
          destinationName: "Sonnenhof",
          returnLegOfId: "ride-new-1",
          trishaws: { create: [{ trishawId: TRISHAW }] },
        }),
      );
      expect(ride.returnLegId).toBe("ride-new-2");
      expect(logTypes()).toEqual(["scheduled", "scheduled"]);
      expect(eventTypes()).toEqual(["ride.scheduled"]);
    });

    it("checks both windows under one lock, before either row is written", async () => {
      await schedule(trip, ADMIN);
      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(db.rideTrishaw.findMany.mock.calls[0][0].where.ride.OR).toEqual([
        { startsAt: { lt: base.endsAt }, endsAt: { gt: base.startsAt } },
        { startsAt: { lt: back.endsAt }, endsAt: { gt: back.startsAt } },
      ]);
    });

    it("books neither leg when the way back is taken", async () => {
      db.rideTrishaw.findMany.mockResolvedValue([
        { trishawId: TRISHAW, rideId: "ride-existing" },
      ]);
      expect(await codeOf(schedule(trip, ADMIN))).toBe("trishawReserved");
      expect(db.ride.create).not.toHaveBeenCalled();
    });

    it("is for functional rides only", async () => {
      await expect(
        schedule({ ...trip, model: "event" }, ADMIN),
      ).rejects.toThrow();
      expect(db.ride.create).not.toHaveBeenCalled();
    });

    it("cannot start back before it arrived", async () => {
      await expect(
        schedule(
          {
            ...trip,
            returnLeg: {
              startsAt: new Date("2026-09-08T09:00:00Z"),
              endsAt: new Date("2026-09-08T11:00:00Z"),
            },
          },
          ADMIN,
        ),
      ).rejects.toThrow();
    });
  });
});

describe("rescheduleRide", () => {
  const later = {
    startsAt: new Date("2026-09-09T08:00:00Z"),
    endsAt: new Date("2026-09-09T10:00:00Z"),
  };

  it("refuses a ride that is not there", async () => {
    db.ride.findUnique.mockResolvedValue(null);
    expect(await codeOf(rides.rescheduleRide("ride-1", later, ADMIN))).toBe(
      "unknownRide",
    );
  });

  it("reads a wall-clock slot in the ride's own chapter zone", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.rescheduleRide(
      "ride-1",
      { date: "2026-09-09", start: "10:00", durationMinutes: 120 },
      ADMIN,
    );
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: later }),
    );
  });

  it("refuses a cancelled ride", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ status: "cancelled" }));
    expect(await codeOf(rides.rescheduleRide("ride-1", later, ADMIN))).toBe(
      "rideClosed",
    );
  });

  it("re-reserves its own trishaws, ignoring its own reservation", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ trishaws: [{ trishaw: { id: TRISHAW, name: "Isarwind" } }] }),
    );
    await rides.rescheduleRide("ride-1", later, ADMIN);
    expect(lockedSql()).toEqual([
      expect.stringContaining("FROM `ride`"),
      expect.stringContaining("FROM `trishaw`"),
    ]);
    expect(db.rideTrishaw.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          trishawId: { in: [TRISHAW] },
          ride: expect.objectContaining({ id: { notIn: ["ride-1"] } }),
        }),
      }),
    );
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ride-1" }, data: later }),
    );
  });

  it("refuses when the new window is taken", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ trishaws: [{ trishaw: { id: TRISHAW, name: "Isarwind" } }] }),
    );
    db.rideTrishaw.findMany.mockResolvedValue([
      { trishawId: TRISHAW, rideId: "ride-other" },
    ]);
    expect(await codeOf(rides.rescheduleRide("ride-1", later, ADMIN))).toBe(
      "trishawReserved",
    );
    expect(db.ride.update).not.toHaveBeenCalled();
  });

  it("logs from and to, and emits once", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.rescheduleRide("ride-1", later, ADMIN);
    expect(logTypes()).toEqual(["rescheduled"]);
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "ride.rescheduled",
        rideId: "ride-1",
        changes: ["time"],
      }),
    ]);
  });

  it("stays silent when nothing moved", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.rescheduleRide("ride-1", base, ADMIN);
    expect(db.ride.update).not.toHaveBeenCalled();
    expect(logTypes()).toEqual([]);
    expect(emitted).toEqual([]);
  });
});

/**
 * Erna's doctor moves her appointment from Tuesday to Wednesday. The admin
 * moves the way there; the way back has to come along, an hour at the doctor
 * later, or the round trip is broken.
 */
describe("moving a round trip", () => {
  const there = (overrides: Record<string, unknown> = {}) =>
    scheduled({
      id: "ride-there",
      model: "functional",
      startsAt: new Date("2026-09-08T08:00:00Z"),
      endsAt: new Date("2026-09-08T08:30:00Z"),
      trishaws: [{ trishaw: { id: TRISHAW, name: "Isarwind" } }],
      returnLeg: {
        id: "ride-back",
        startsAt: new Date("2026-09-08T09:30:00Z"),
        endsAt: new Date("2026-09-08T10:00:00Z"),
        status: "scheduled",
      },
      ...overrides,
    });
  const back = (overrides: Record<string, unknown> = {}) =>
    scheduled({
      id: "ride-back",
      model: "functional",
      startsAt: new Date("2026-09-08T09:30:00Z"),
      endsAt: new Date("2026-09-08T10:00:00Z"),
      trishaws: [{ trishaw: { id: TRISHAW, name: "Isarwind" } }],
      returnLegOf: {
        id: "ride-there",
        startsAt: new Date("2026-09-08T08:00:00Z"),
        endsAt: new Date("2026-09-08T08:30:00Z"),
        status: "scheduled",
      },
      ...overrides,
    });
  const rows = (rows: Record<string, unknown>[]) =>
    db.ride.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(rows.find((row) => row.id === where.id) ?? null),
    );
  const nextDay = {
    startsAt: new Date("2026-09-09T08:00:00Z"),
    endsAt: new Date("2026-09-09T08:30:00Z"),
  };

  it("moves a scheduled way back by as much as the way there", async () => {
    rows([there(), back()]);
    const result = await rides.rescheduleRide("ride-there", nextDay, ADMIN);
    expect(result.movedReturnLeg).toBe(true);
    expect(
      db.ride.update.mock.calls.map(([args]) => [args.where.id, args.data]),
    ).toEqual([
      ["ride-there", nextDay],
      [
        "ride-back",
        {
          startsAt: new Date("2026-09-09T09:30:00Z"),
          endsAt: new Date("2026-09-09T10:00:00Z"),
        },
      ],
    ]);
    expect(eventTypes()).toEqual(["ride.rescheduled", "ride.rescheduled"]);
    expect(db.rideLogEntry.create.mock.calls[1][0].data.payload.withLegOf).toBe(
      "ride-there",
    );
  });

  it("keeps the time at the destination when the way there gets longer", async () => {
    rows([there(), back()]);
    await rides.rescheduleRide(
      "ride-there",
      {
        startsAt: new Date("2026-09-08T08:00:00Z"),
        endsAt: new Date("2026-09-08T08:45:00Z"),
      },
      ADMIN,
    );
    expect(db.ride.update.mock.calls[1][0].data).toEqual({
      startsAt: new Date("2026-09-08T09:45:00Z"),
      endsAt: new Date("2026-09-08T10:15:00Z"),
    });
  });

  it("checks the trishaws for both new windows, ignoring both legs' old ones", async () => {
    rows([there(), back()]);
    await rides.rescheduleRide("ride-there", nextDay, ADMIN);
    const checks = db.rideTrishaw.findMany.mock.calls.map(
      ([args]) => args.where.ride,
    );
    expect(checks).toEqual([
      expect.objectContaining({
        startsAt: { lt: nextDay.endsAt },
        id: { notIn: ["ride-there", "ride-back"] },
      }),
      expect.objectContaining({
        startsAt: { lt: new Date("2026-09-09T10:00:00Z") },
        id: { notIn: ["ride-there", "ride-back"] },
      }),
    ]);
  });

  it("moves neither leg when the way back's new window is taken", async () => {
    rows([there(), back()]);
    db.rideTrishaw.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ trishawId: TRISHAW, rideId: "ride-other" }]);
    expect(
      await codeOf(rides.rescheduleRide("ride-there", nextDay, ADMIN)),
    ).toBe("trishawReserved");
    expect(db.ride.update).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("leaves a cancelled way back where it is", async () => {
    rows([
      there({
        returnLeg: {
          id: "ride-back",
          startsAt: new Date("2026-09-08T09:30:00Z"),
          endsAt: new Date("2026-09-08T10:00:00Z"),
          status: "cancelled",
        },
      }),
    ]);
    const result = await rides.rescheduleRide("ride-there", nextDay, ADMIN);
    expect(result.movedReturnLeg).toBe(false);
    expect(db.ride.update.mock.calls.map(([args]) => args.where.id)).toEqual([
      "ride-there",
    ]);
  });

  it("moves the way back on its own, but not to before the way there arrives", async () => {
    rows([back()]);
    await rides.rescheduleRide(
      "ride-back",
      {
        startsAt: new Date("2026-09-08T10:00:00Z"),
        endsAt: new Date("2026-09-08T10:30:00Z"),
      },
      ADMIN,
    );
    expect(db.ride.update).toHaveBeenCalledTimes(1);
    expect(
      await codeOf(
        rides.rescheduleRide(
          "ride-back",
          {
            startsAt: new Date("2026-09-08T08:15:00Z"),
            endsAt: new Date("2026-09-08T08:45:00Z"),
          },
          ADMIN,
        ),
      ),
    ).toBe("legsOverlap");
  });

  it("lets the way back move freely once the way there is cancelled", async () => {
    rows([
      back({
        returnLegOf: {
          id: "ride-there",
          startsAt: new Date("2026-09-08T08:00:00Z"),
          endsAt: new Date("2026-09-08T08:30:00Z"),
          status: "cancelled",
        },
      }),
    ]);
    await rides.rescheduleRide(
      "ride-back",
      {
        startsAt: new Date("2026-09-08T07:00:00Z"),
        endsAt: new Date("2026-09-08T07:30:00Z"),
      },
      ADMIN,
    );
    expect(db.ride.update).toHaveBeenCalledTimes(1);
  });
});

describe("rescheduling a wall-clock patch", () => {
  // The ride runs 10:00–12:00 Berlin time (08:00–10:00 UTC).
  it("keeps what the patch leaves out, as read under the lock", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.rescheduleRide("ride-1", { durationMinutes: 60 }, ADMIN);
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          startsAt: new Date("2026-09-08T08:00:00Z"),
          endsAt: new Date("2026-09-08T09:00:00Z"),
        },
      }),
    );
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.ride.findUnique.mock.invocationCallOrder.at(-1)!,
    );
  });

  // Start first, then length: the second save must not put the old start back.
  it("lets two quick edits of different fields both stand", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        startsAt: new Date("2026-09-08T09:00:00Z"),
        endsAt: new Date("2026-09-08T11:00:00Z"),
      }),
    );
    await rides.rescheduleRide("ride-1", { durationMinutes: 90 }, ADMIN);
    expect(db.ride.update.mock.calls[0][0].data).toEqual({
      startsAt: new Date("2026-09-08T09:00:00Z"),
      endsAt: new Date("2026-09-08T10:30:00Z"),
    });
  });

  it("says whether anything moved", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(
      (await rides.rescheduleRide("ride-1", { start: "10:00" }, ADMIN)).changed,
    ).toBe(false);
    expect(
      (await rides.rescheduleRide("ride-1", { start: "11:00" }, ADMIN)).changed,
    ).toBe(true);
  });
});

describe("updateRideDetails", () => {
  it("writes only what changed and tells riders when the place moved", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.updateRideDetails(
      "ride-1",
      { locationName: "Englischer Garten", requiredPilots: 1 },
      ADMIN,
    );
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { locationName: "Englischer Garten" } }),
    );
    expect(eventTypes()).toEqual(["ride.rescheduled"]);
    expect(emitted[0]).toEqual(
      expect.objectContaining({ changes: ["location"] }),
    );
  });

  it("keeps the note for pilots out of the event and the log payload", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.updateRideDetails("ride-1", { note: "Ring twice." }, ADMIN);
    expect(emitted).toEqual([]);
    const payload = db.rideLogEntry.create.mock.calls[0][0].data.payload;
    expect(payload.fields).toEqual(["note"]);
    expect(JSON.stringify(payload)).not.toContain("Ring twice.");
  });

  it("stays silent when nothing changed", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.updateRideDetails(
      "ride-1",
      { locationName: "Sonnenhof", requiredPilots: 1 },
      ADMIN,
    );
    expect(db.ride.update).not.toHaveBeenCalled();
    expect(logTypes()).toEqual([]);
  });

  it("drops the destination when a ride stops being functional", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ model: "functional", destinationName: "Dr. Weber" }),
    );
    await rides.updateRideDetails(
      "ride-1",
      { model: "event", title: "Sommerfest", capacity: 6 },
      ADMIN,
    );
    expect(db.ride.update.mock.calls[0][0].data).toEqual({
      model: "event",
      title: "Sommerfest",
      capacity: 6,
      destinationName: null,
    });
  });

  it.each([
    [{ model: "event", capacity: 6 }, "titleRequired"],
    [{ model: "event", title: "  ", capacity: 6 }, "titleRequired"],
    [{ model: "event", title: "Sommerfest" }, "capacityRequired"],
    [
      { model: "event", title: "Sommerfest", capacity: null },
      "capacityRequired",
    ],
  ] as const)(
    "refuses to turn a ride into an event without a title and capacity: %o",
    async (patch, code) => {
      db.ride.findUnique.mockResolvedValue(scheduled({ model: "pleasure" }));
      expect(
        await codeOf(rides.updateRideDetails("ride-1", patch, ADMIN)),
      ).toBe(code);
      expect(db.ride.update).not.toHaveBeenCalled();
    },
  );

  it("turns a ride into an event with the title and capacity it already has", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ model: "pleasure", title: "Sommerfest", capacity: 4 }),
    );
    await rides.updateRideDetails("ride-1", { model: "event" }, ADMIN);
    expect(db.ride.update.mock.calls[0][0].data).toEqual({ model: "event" });
  });

  it("refuses an event capacity below the riders already booked", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        model: "pleasure",
        roster: [{ passengerId: "p-1" }, { passengerId: "p-2" }],
      }),
    );
    expect(
      await codeOf(
        rides.updateRideDetails(
          "ride-1",
          { model: "event", title: "Sommerfest", capacity: 1 },
          ADMIN,
        ),
      ),
    ).toBe("capacityBelowRoster");
  });

  it("keeps both legs of a round trip functional", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        model: "functional",
        returnLeg: { id: "ride-back", status: "scheduled" },
      }),
    );
    expect(
      await codeOf(
        rides.updateRideDetails("ride-1", { model: "pleasure" }, ADMIN),
      ),
    ).toBe("partOfRoundTrip");
  });
});

describe("cancelRide", () => {
  it("keeps the ride on the calendar and records code, note, who and when", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.cancelRide(
      "ride-1",
      { reasonCode: "weather", note: "  Storm warning  " },
      ADMIN,
    );
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ride-1" },
        data: expect.objectContaining({
          status: "cancelled",
          cancelledAt: expect.any(Date),
          cancellationReasonCode: "weather",
          cancellationNote: "Storm warning",
          cancelledByUserId: ADMIN,
        }),
      }),
    );
    expect(db.ride.delete).not.toHaveBeenCalled();
    expect(logTypes()).toEqual(["cancelled"]);
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "ride.cancelled",
        reasonCode: "weather",
      }),
    ]);
  });

  it("stores no note rather than an empty one", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.cancelRide(
      "ride-1",
      { reasonCode: "other", note: "  " },
      ADMIN,
    );
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cancellationNote: null }),
      }),
    );
  });

  // The conflict check skips cancelled rides; nothing else has to be undone.
  it("frees the trishaws by status, so their rows stay as history", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ trishaws: [{ trishaw: { id: TRISHAW, name: "Isarwind" } }] }),
    );
    await rides.cancelRide("ride-1", { reasonCode: "weather" }, ADMIN);
    expect(db.ride.update.mock.calls[0][0].data.trishaws).toBeUndefined();
  });

  it("takes the way back with it", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ returnLeg: { id: "ride-back", status: "scheduled" } }),
    );
    const { cancelledIds } = await rides.cancelRide(
      "ride-1",
      { reasonCode: "rider" },
      ADMIN,
    );
    expect(cancelledIds).toEqual(["ride-1", "ride-back"]);
    expect(eventTypes()).toEqual(["ride.cancelled", "ride.cancelled"]);
  });

  it("leaves the way back when asked to", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ returnLeg: { id: "ride-back", status: "scheduled" } }),
    );
    const { cancelledIds } = await rides.cancelRide(
      "ride-1",
      { reasonCode: "rider", includeReturnLeg: false },
      ADMIN,
    );
    expect(cancelledIds).toEqual(["ride-1"]);
  });

  it("is silent for a ride already cancelled", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ status: "cancelled" }));
    await rides.cancelRide("ride-1", { reasonCode: "weather" }, ADMIN);
    expect(db.ride.update).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("refuses a ride that is not there", async () => {
    db.ride.findUnique.mockResolvedValue(null);
    expect(
      await codeOf(rides.cancelRide("ride-1", { reasonCode: "other" }, ADMIN)),
    ).toBe("unknownRide");
  });
});

describe("deleteRide", () => {
  it("deletes only a cancelled ride", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(await codeOf(rides.deleteRide("ride-1", ADMIN))).toBe(
      "rideNotCancelled",
    );
    expect(db.ride.delete).not.toHaveBeenCalled();

    db.ride.findUnique.mockResolvedValue(scheduled({ status: "cancelled" }));
    await rides.deleteRide("ride-1", ADMIN);
    expect(db.ride.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ride-1" } }),
    );
  });

  describe("one leg of a round trip", () => {
    const leg = (status: string) =>
      scheduled({
        status: "cancelled",
        returnLeg: { id: "ride-back", status },
      });

    it("takes a cancelled other leg with it", async () => {
      db.ride.findUnique.mockResolvedValue(leg("cancelled"));
      const { deletedIds } = await rides.deleteRide("ride-1", ADMIN);
      expect(deletedIds).toEqual(["ride-1", "ride-back"]);
      expect(db.ride.delete.mock.calls.map(([args]) => args.where.id)).toEqual([
        "ride-1",
        "ride-back",
      ]);
      expect(eventTypes()).toEqual(["ride.deleted", "ride.deleted"]);
    });

    // Otherwise the way back is left with swapped places and nothing to return from.
    it("refuses while the other leg is still going ahead", async () => {
      db.ride.findUnique.mockResolvedValue(leg("scheduled"));
      expect(await codeOf(rides.deleteRide("ride-1", ADMIN))).toBe(
        "otherLegScheduled",
      );
      expect(db.ride.delete).not.toHaveBeenCalled();
      expect(emitted).toEqual([]);
    });

    it("leaves a completed other leg in the records", async () => {
      db.ride.findUnique.mockResolvedValue(leg("completed"));
      expect((await rides.deleteRide("ride-1", ADMIN)).deletedIds).toEqual([
        "ride-1",
      ]);
    });
  });

  // The history goes with the ride; the event is what is left of who did it.
  it("leaves an event behind", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ status: "cancelled" }));
    await rides.deleteRide("ride-1", ADMIN);
    expect(emitted).toEqual([
      {
        type: "ride.deleted",
        rideId: "ride-1",
        chapterId: CHAPTER,
        actorUserId: ADMIN,
      },
    ]);
  });
});

/**
 * MySQL's default REPEATABLE READ fixes a transaction's snapshot at its first
 * read. A ride write reads the ride before it waits for the trishaw lock, so
 * only READ COMMITTED lets the conflict check see the booking it waited for.
 */
describe("serialising writes", () => {
  it("runs every write at READ COMMITTED", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await schedule(base, ADMIN);
    await rides.rescheduleRide(
      "ride-1",
      {
        startsAt: new Date("2026-09-09T08:00:00Z"),
        endsAt: new Date("2026-09-09T10:00:00Z"),
      },
      ADMIN,
    );
    await rides.cancelRide("ride-1", { reasonCode: "weather" }, ADMIN);
    for (const [, options] of (transaction as jest.Mock).mock.calls)
      expect(options).toEqual({ isolationLevel: "ReadCommitted" });
  });

  it("locks the ride and its other leg, in id order, before reading it", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ id: "ride-b", returnLegOfId: "ride-a", returnLeg: null }),
    );
    await rides.bookRider("ride-b", "passenger-1", ADMIN);
    const [first] = db.$queryRaw.mock.calls;
    expect(String(first[0].strings.join("?"))).toContain("FOR UPDATE");
    expect(first[0].values).toEqual(["ride-a", "ride-b"]);
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.ride.findUnique.mock.invocationCallOrder[1],
    );
  });
});

describe("listRideLog", () => {
  it("reads only as many entries as the page shows, and counts them all", async () => {
    db.rideLogEntry.findMany.mockResolvedValue([]);
    db.rideLogEntry.count.mockResolvedValue(312);
    await rides.listRideLog("ride-1", 40);
    expect(db.rideLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rideId: "ride-1" }, take: 40 }),
    );
    expect(await rides.countRideLog("ride-1")).toBe(312);
  });

  it("names people as it reads, and names nobody who is gone", async () => {
    db.rideLogEntry.findMany.mockResolvedValue([
      { id: "1", type: "pilotAssigned", payload: { userId: "user-1" } },
      { id: "2", type: "riderBooked", payload: { passengerId: "gone" } },
      { id: "3", type: "note", payload: { text: "Blanket" } },
    ]);
    db.user.findMany.mockResolvedValue([{ id: "user-1", name: "Pernille" }]);
    db.passenger.findMany.mockResolvedValue([]);
    const log = await rides.listRideLog("ride-1");
    expect(log.map((entry) => entry.payload)).toEqual([
      { userId: "user-1", name: "Pernille" },
      { passengerId: "gone", name: null },
      { text: "Blanket" },
    ]);
  });
});

describe("setRideTrishaws", () => {
  it("replaces the reservation set under the lock and logs what moved", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ trishaws: [{ trishaw: { id: "old", name: "Isarwind" } }] }),
    );
    db.ride.update.mockResolvedValue(
      scheduled({
        trishaws: [{ trishaw: { id: TRISHAW, name: "Alsterschwan" } }],
      }),
    );
    await rides.setRideTrishaws("ride-1", [TRISHAW], ADMIN);
    expect(lockedSql()).toEqual([
      expect.stringContaining("FROM `ride`"),
      expect.stringContaining("FROM `trishaw`"),
    ]);
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          trishaws: { deleteMany: {}, create: [{ trishawId: TRISHAW }] },
        },
      }),
    );
    expect(db.rideLogEntry.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        type: "trishawsChanged",
        payload: {
          added: [{ id: TRISHAW, name: "Alsterschwan" }],
          removed: [{ id: "old", name: "Isarwind" }],
        },
      }),
    );
  });

  it("stays silent when the set is unchanged", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ trishaws: [{ trishaw: { id: TRISHAW, name: "Isarwind" } }] }),
    );
    await rides.setRideTrishaws("ride-1", [TRISHAW], ADMIN);
    expect(db.ride.update).not.toHaveBeenCalled();
    expect(logTypes()).toEqual([]);
  });

  it("refuses a cancelled ride", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ status: "cancelled" }));
    expect(
      await codeOf(rides.setRideTrishaws("ride-1", [TRISHAW], ADMIN)),
    ).toBe("rideClosed");
  });
});

describe("roster and staffing", () => {
  const pilotOn = [{ role: "pilot", user: { id: "user-1" } }];
  beforeEach(() => db.ride.findUnique.mockResolvedValue(scheduled()));

  it("appends a rider to the end of the roster", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: [{ position: 1, passenger: { id: "p-0" } }] }),
    );
    db.rideRosterEntry.create.mockResolvedValue({
      id: "entry-1",
      passenger: { firstName: "Erna", lastName: "Huber" },
    });
    await rides.bookRider("ride-1", "passenger-1", ADMIN);
    expect(db.rideRosterEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          rideId: "ride-1",
          passengerId: "passenger-1",
          position: 2,
          bookedByUserId: ADMIN,
        },
      }),
    );
    expect(logTypes()).toEqual(["riderBooked"]);
    expect(db.rideLogEntry.create.mock.calls[0][0].data.payload).toEqual({
      passengerId: "passenger-1",
    });
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "ride.riderBooked",
        passengerId: "passenger-1",
      }),
    ]);
  });

  it("does not book the same rider twice, and says nothing", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: riders("passenger-1") }),
    );
    expect(await rides.bookRider("ride-1", "passenger-1", ADMIN)).toBe(false);
    expect(db.rideRosterEntry.create).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("removes a rider once, with one event", async () => {
    expect(await rides.cancelBooking("ride-1", "passenger-1", ADMIN)).toBe(
      false,
    );
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: riders("passenger-1") }),
    );
    await rides.cancelBooking("ride-1", "passenger-1", ADMIN);
    expect(db.rideRosterEntry.deleteMany).toHaveBeenCalledWith({
      where: { rideId: "ride-1", passengerId: "passenger-1" },
    });
    expect(eventTypes()).toEqual(["ride.riderRemoved"]);
  });

  it("records who assigned a pilot, and that it was not self sign-up", async () => {
    db.rideAssignment.create.mockResolvedValue({
      id: "assignment-1",
      user: { name: "Pernille" },
    });
    await rides.assignVolunteer("ride-1", "user-1", ADMIN);
    expect(db.rideAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          rideId: "ride-1",
          userId: "user-1",
          role: "pilot",
          assignedByUserId: ADMIN,
        },
      }),
    );
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "ride.pilotAssigned",
        userId: "user-1",
        self: false,
      }),
    ]);
  });

  it("marks a pilot who signed up themself", async () => {
    db.rideAssignment.create.mockResolvedValue({
      id: "assignment-1",
      user: { name: "Pernille" },
    });
    await rides.assignVolunteer("ride-1", "user-1", "user-1");
    expect(
      db.rideAssignment.create.mock.calls[0][0].data.assignedByUserId,
    ).toBe(null);
    expect(emitted[0]).toEqual(expect.objectContaining({ self: true }));
  });

  it("is silent when the pilot is already on the ride", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ assignments: pilotOn }));
    expect(await rides.assignVolunteer("ride-1", "user-1", ADMIN)).toBe(false);
    expect(emitted).toEqual([]);
  });

  it("refuses to staff a ride that is not there", async () => {
    db.ride.findUnique.mockResolvedValue(null);
    expect(await codeOf(rides.assignVolunteer("ride-1", "user-1", ADMIN))).toBe(
      "unknownRide",
    );
    expect(db.rideAssignment.create).not.toHaveBeenCalled();
  });

  it("refuses to staff a cancelled ride", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ status: "cancelled" }));
    expect(await codeOf(rides.assignVolunteer("ride-1", "user-1", ADMIN))).toBe(
      "rideClosed",
    );
  });

  it("unassigns with one event, and only when assigned", async () => {
    expect(await rides.unassignVolunteer("ride-1", "user-1", ADMIN)).toBe(
      false,
    );
    db.ride.findUnique.mockResolvedValue(scheduled({ assignments: pilotOn }));
    await rides.unassignVolunteer("ride-1", "user-1", ADMIN);
    expect(eventTypes()).toEqual(["ride.pilotUnassigned"]);
  });
});

describe("bookedTrishawIds", () => {
  it("is the trishaws another live ride holds in any window, without a lock", async () => {
    db.rideTrishaw.findMany.mockResolvedValue([
      { trishawId: TRISHAW, rideId: "ride-2" },
    ]);
    const windows = [base, { startsAt: base.endsAt, endsAt: base.endsAt }];
    expect(
      await rides.bookedTrishawIds([TRISHAW, "trishaw-2"], windows, ["ride-1"]),
    ).toEqual(new Set([TRISHAW]));
    expect(db.rideTrishaw.findMany.mock.calls[0][0].where.ride).toEqual({
      status: { not: "cancelled" },
      OR: windows.map((window) => ({
        startsAt: { lt: window.endsAt },
        endsAt: { gt: window.startsAt },
      })),
      id: { notIn: ["ride-1"] },
    });
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it("asks the database nothing without trishaws", async () => {
    expect(await rides.bookedTrishawIds([], [base])).toEqual(new Set());
    expect(db.rideTrishaw.findMany).not.toHaveBeenCalled();
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
  it("requires the pilot role there as well as the assignment", async () => {
    await rides.listRidesForPilot("user-1", new Date(), new Date());
    expect(db.ride.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignments: { some: { userId: "user-1" } },
          // Removing a member deletes the member row, and demoting one only
          // rewrites its roles — neither touches the assignment.
          chapter: {
            members: {
              some: { userId: "user-1", role: { contains: "pilot" } },
            },
          },
        }),
      }),
    );
  });
});

/**
 * The RFP's contact-detail exchange is between the rider and the pilot matched
 * to them — not between riders who happen to share a trishaw.
 */
/**
 * A member reads a ride as a member: a pilot learns their co-pilots' names and
 * their riders' names, a rider's account learns the pilot's name and its own
 * riders — and nobody but an admin learns anyone's email address.
 */
describe("what a member may read", () => {
  const userOf = (select: { assignments: { select: { user: unknown } } }) =>
    select.assignments.select.user;
  const noEmail = { select: { id: true, name: true, image: true } };

  it("gives the passenger agenda pilots' names but not their email", async () => {
    await rides.listRidesForPassengers(["passenger-1"], new Date(), new Date());
    expect(userOf(db.ride.findMany.mock.calls[0][0].select)).toEqual(noEmail);
  });

  it("gives a pilot their co-pilots' names but not their email", async () => {
    db.ride.findMany.mockResolvedValue([]);
    await rides.listPilotRides("user-1");
    for (const [args] of db.ride.findMany.mock.calls)
      expect(userOf(args.select)).toEqual(noEmail);
  });

  it("splits a member's rides into what is coming and the newest past", async () => {
    const NOW = new Date("2026-10-07T12:00:00Z");
    db.ride.findMany.mockResolvedValue([]);
    await rides.listPassengerRides(["passenger-1"], NOW);
    const [upcoming, past] = db.ride.findMany.mock.calls.map(([args]) => args);
    expect(upcoming.where.endsAt).toEqual({ gt: NOW });
    expect(upcoming.orderBy[0]).toEqual({ startsAt: "asc" });
    expect(past.where.endsAt).toEqual({ lte: NOW });
    expect(past.orderBy[0]).toEqual({ startsAt: "desc" });
  });

  it("asks nothing for an account that manages no rider", async () => {
    expect(await rides.listPassengerRides([])).toEqual({
      upcoming: [],
      past: [],
    });
    expect(await rides.getRideForPassengers("ride-1", [])).toBeNull();
    expect(db.ride.findMany).not.toHaveBeenCalled();
    expect(db.ride.findFirst).not.toHaveBeenCalled();
  });

  it("opens a ride to a pilot only while assigned and still a member", async () => {
    await rides.getRideForPilot("ride-1", "user-1");
    const args = db.ride.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({
      id: "ride-1",
      assignments: { some: { userId: "user-1" } },
      chapter: {
        members: { some: { userId: "user-1", role: { contains: "pilot" } } },
      },
    });
    expect(args.select.note).toBe(true);
    expect(args.select.roster).toBeDefined();
  });

  // A care home's carer manages several residents; the ride may carry others.
  it("shows a rider's account only its own riders, and not the pilots' note", async () => {
    await rides.getRideForPassengers("ride-1", ["passenger-1"]);
    const args = db.ride.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({
      id: "ride-1",
      roster: { some: { passengerId: { in: ["passenger-1"] } } },
    });
    expect(args.select.roster.where).toEqual({
      passengerId: { in: ["passenger-1"] },
    });
    expect(args.select.note).toBeUndefined();
    expect(args.select.cancellationNote).toBeUndefined();
    expect(userOf(args.select)).toEqual(noEmail);
  });

  it("names everyone a change concerns, once", async () => {
    db.ride.findUnique.mockResolvedValue({
      chapterId: "chapter-muenchen",
      roster: [
        { passenger: { managedByUserId: "carer-1", userId: null } },
        { passenger: { managedByUserId: "carer-1", userId: "rider-2" } },
      ],
    });
    db.rideAssignment.findMany.mockResolvedValue([
      { userId: "pilot-1" },
      { userId: "pilot-1" },
    ]);
    expect(await rides.listRideParticipants("ride-1")).toEqual({
      chapterId: "chapter-muenchen",
      pilotUserIds: ["pilot-1"],
      riderAccountUserIds: ["carer-1", "rider-2"],
    });
  });

  // A pilot who left the chapter, or lost the role, is told nothing more.
  it("counts only pilots who still pilot in the ride's chapter", async () => {
    db.ride.findUnique.mockResolvedValue({
      chapterId: "chapter-muenchen",
      roster: [],
    });
    db.rideAssignment.findMany.mockResolvedValue([]);
    await rides.listRideParticipants("ride-1");
    expect(db.rideAssignment.findMany.mock.calls[0][0].where).toEqual({
      rideId: "ride-1",
      user: {
        members: {
          some: {
            organizationId: "chapter-muenchen",
            role: { contains: "pilot" },
          },
        },
      },
    });
  });
});

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

const riders = (...ids: string[]) =>
  ids.map((passengerId, index) => ({
    id: `entry-${passengerId}`,
    position: index * 2,
    passenger: { id: passengerId },
  }));

describe("model limits", () => {
  it("refuses a rider once an event is at capacity", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ capacity: 2, roster: riders("p-1", "p-2") }),
    );
    expect(await codeOf(rides.bookRider("ride-1", "p-3", ADMIN))).toBe(
      "rideFull",
    );
    expect(db.rideRosterEntry.create).not.toHaveBeenCalled();
  });

  it("refuses a third passenger on a pleasure ride", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ model: "pleasure", roster: riders("p-1", "p-2") }),
    );
    expect(await codeOf(rides.bookRider("ride-1", "p-3", ADMIN))).toBe(
      "pleasureLimit",
    );
  });

  it("books on an event without a capacity, as rides from before capacities", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: riders("p-1", "p-2", "p-3") }),
    );
    expect(await rides.bookRider("ride-1", "p-4", ADMIN)).toBe(true);
  });

  it("refuses a second pilot on a pleasure ride", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        model: "pleasure",
        assignments: [{ role: "pilot", user: { id: "pilot-1" } }],
      }),
    );
    expect(
      await codeOf(rides.assignVolunteer("ride-1", "pilot-2", ADMIN)),
    ).toBe("pleasureLimit");
    expect(db.rideAssignment.create).not.toHaveBeenCalled();
  });

  it("refuses a second trishaw on a pleasure ride but lets one go", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        model: "pleasure",
        trishaws: [{ trishaw: { id: "old", name: "Isarwind" } }],
      }),
    );
    expect(
      await codeOf(rides.setRideTrishaws("ride-1", ["old", TRISHAW], ADMIN)),
    ).toBe("pleasureLimit");
    expect(await codeOf(rides.setRideTrishaws("ride-1", [], ADMIN))).toBe(null);
  });

  it("refuses to make a ride with three riders a pleasure ride", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: riders("p-1", "p-2", "p-3") }),
    );
    expect(
      await codeOf(
        rides.updateRideDetails("ride-1", { model: "pleasure" }, ADMIN),
      ),
    ).toBe("pleasureLimit");
    expect(db.ride.update).not.toHaveBeenCalled();
  });

  it("sets one pilot when a ride becomes a pleasure ride", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ requiredPilots: 3 }));
    await rides.updateRideDetails("ride-1", { model: "pleasure" }, ADMIN);
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { model: "pleasure", requiredPilots: 1 },
      }),
    );
  });

  it("refuses more pilots needed on a pleasure ride", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ model: "pleasure" }));
    expect(
      await codeOf(
        rides.updateRideDetails("ride-1", { requiredPilots: 2 }, ADMIN),
      ),
    ).toBe("pleasureLimit");
  });

  it("refuses a capacity below the riders already booked", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ capacity: 5, roster: riders("p-1", "p-2", "p-3") }),
    );
    expect(
      await codeOf(rides.updateRideDetails("ride-1", { capacity: 2 }, ADMIN)),
    ).toBe("capacityBelowRoster");
  });

  it("refuses to make a ride functional with more riders than it seats", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ capacity: 5, roster: riders("p-1", "p-2", "p-3") }),
    );
    expect(
      await codeOf(
        rides.updateRideDetails(
          "ride-1",
          { model: "functional", destinationName: "Dr. Weber" },
          ADMIN,
        ),
      ),
    ).toBe("capacityBelowRoster");
    expect(db.ride.update).not.toHaveBeenCalled();
  });

  it("refuses to make a ride functional without a destination", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ model: "pleasure" }));
    expect(
      await codeOf(
        rides.updateRideDetails("ride-1", { model: "functional" }, ADMIN),
      ),
    ).toBe("destinationRequired");
    await rides.updateRideDetails(
      "ride-1",
      { model: "functional", destinationName: "Dr. Weber" },
      ADMIN,
    );
    expect(db.ride.update).toHaveBeenCalledTimes(1);
  });

  it("refuses fewer pilots needed than are already on the ride", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        requiredPilots: 3,
        assignments: [
          { role: "pilot", user: { id: "pilot-1" } },
          { role: "pilot", user: { id: "pilot-2" } },
        ],
      }),
    );
    expect(
      await codeOf(
        rides.updateRideDetails("ride-1", { requiredPilots: 1 }, ADMIN),
      ),
    ).toBe("tooManyPilots");
    expect(db.ride.update).not.toHaveBeenCalled();
  });

  it("refuses a pilot once the pilots needed are on the ride", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        requiredPilots: 2,
        assignments: [
          { role: "pilot", user: { id: "pilot-1" } },
          { role: "pilot", user: { id: "pilot-2" } },
        ],
      }),
    );
    expect(
      await codeOf(rides.assignVolunteer("ride-1", "pilot-3", ADMIN)),
    ).toBe("pilotsFull");
    expect(db.rideAssignment.create).not.toHaveBeenCalled();
  });

  it("refuses to take an event with photos to another model", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ title: "Fest", capacity: 5, photos: [{ fileId: "f-1" }] }),
    );
    expect(
      await codeOf(
        rides.updateRideDetails("ride-1", { model: "pleasure" }, ADMIN),
      ),
    ).toBe("photosEventOnly");
  });

  it("lets an event missing title and capacity be fixed one field at a time", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(
      await codeOf(rides.updateRideDetails("ride-1", { capacity: 4 }, ADMIN)),
    ).toBe(null);
    expect(
      await codeOf(rides.updateRideDetails("ride-1", { note: "Hi" }, ADMIN)),
    ).toBe(null);
  });

  it("refuses to clear an event ride's title or capacity", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ model: "event", title: "Alt", capacity: 5 }),
    );
    expect(
      await codeOf(rides.updateRideDetails("ride-1", { title: " " }, ADMIN)),
    ).toBe("titleRequired");
    expect(
      await codeOf(
        rides.updateRideDetails("ride-1", { capacity: null }, ADMIN),
      ),
    ).toBe("capacityRequired");
    expect(db.ride.update).not.toHaveBeenCalled();
  });

  it("logs a new title and keeps the description out of the log", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ title: "Alt" }));
    await rides.updateRideDetails(
      "ride-1",
      { title: "Sommerfest", description: "Kuchen im Park" },
      ADMIN,
    );
    const payload = db.rideLogEntry.create.mock.calls[0][0].data.payload;
    expect(payload.fields).toEqual(["title", "description"]);
    expect(payload.to).toEqual({ title: "Sommerfest" });
    expect(JSON.stringify(payload)).not.toContain("Kuchen");
  });
});

describe("roster positions", () => {
  it("inserts a rider before whoever is at that place, moving the rest down", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: riders("p-1", "p-2", "p-3") }),
    );
    await rides.bookRider("ride-1", "p-new", ADMIN, 1);
    expect(db.rideRosterEntry.updateMany).toHaveBeenCalledWith({
      where: { rideId: "ride-1", position: { gte: 2 } },
      data: { position: { increment: 1 } },
    });
    expect(db.rideRosterEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passengerId: "p-new", position: 2 }),
      }),
    );
  });

  it("appends when the place is past the end", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: riders("p-1") }));
    await rides.bookRider("ride-1", "p-new", ADMIN, 5);
    expect(db.rideRosterEntry.updateMany).not.toHaveBeenCalled();
    expect(db.rideRosterEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 1 }),
      }),
    );
  });

  it("refuses a negative place", async () => {
    await expect(
      rides.bookRider("ride-1", "p-new", ADMIN, -1),
    ).rejects.toThrow();
  });

  it("writes the new order as positions and logs both orders", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: riders("p-1", "p-2", "p-3") }),
    );
    expect(
      await rides.reorderRoster(
        { rideId: "ride-1", passengerIds: ["p-3", "p-1", "p-2"] },
        ADMIN,
      ),
    ).toBe(true);
    expect(
      db.rideRosterEntry.updateMany.mock.calls.map(([args]) => [
        args.where.passengerId,
        args.data.position,
      ]),
    ).toEqual([
      ["p-3", 0],
      ["p-1", 1],
      ["p-2", 2],
    ]);
    expect(logTypes()).toEqual(["rosterReordered"]);
    expect(db.rideLogEntry.create.mock.calls[0][0].data.payload).toEqual({
      from: ["p-1", "p-2", "p-3"],
      to: ["p-3", "p-1", "p-2"],
    });
  });

  it("refuses an order that names other riders than the roster", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: riders("p-1", "p-2") }),
    );
    expect(
      await codeOf(
        rides.reorderRoster(
          { rideId: "ride-1", passengerIds: ["p-2", "p-9"] },
          ADMIN,
        ),
      ),
    ).toBe("rosterChanged");
    expect(db.rideRosterEntry.updateMany).not.toHaveBeenCalled();
  });

  it("stays silent when the order is unchanged", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: riders("p-1", "p-2") }),
    );
    expect(
      await rides.reorderRoster(
        { rideId: "ride-1", passengerIds: ["p-1", "p-2"] },
        ADMIN,
      ),
    ).toBe(false);
    expect(logTypes()).toEqual([]);
  });
});

describe("people and photos at scheduling", () => {
  it("books the riders in order and staffs the pilots, one log row and event each", async () => {
    await schedule(
      { ...base, passengerIds: ["p-1", "p-2"], pilotIds: ["pilot-1"] },
      ADMIN,
    );
    expect(db.rideRosterEntry.createMany).toHaveBeenCalledWith({
      data: [
        {
          rideId: "ride-new-1",
          passengerId: "p-1",
          position: 0,
          bookedByUserId: ADMIN,
        },
        {
          rideId: "ride-new-1",
          passengerId: "p-2",
          position: 1,
          bookedByUserId: ADMIN,
        },
      ],
    });
    expect(db.rideAssignment.createMany).toHaveBeenCalledWith({
      data: [
        {
          rideId: "ride-new-1",
          userId: "pilot-1",
          role: "pilot",
          assignedByUserId: ADMIN,
        },
      ],
    });
    expect(logTypes()).toEqual([
      "scheduled",
      "riderBooked",
      "riderBooked",
      "pilotAssigned",
    ]);
    expect(eventTypes()).toEqual([
      "ride.scheduled",
      "ride.riderBooked",
      "ride.riderBooked",
      "ride.pilotAssigned",
    ]);
  });

  it("refuses more riders than the event holds", async () => {
    await expect(
      schedule({ ...base, capacity: 1, passengerIds: ["p-1", "p-2"] }, ADMIN),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("attaches the actor's own ride photos in order", async () => {
    db.storedFile.findMany.mockResolvedValue([
      {
        id: "f-1",
        kind: "ridePhoto",
        uploadedByUserId: ADMIN,
        ridePhotos: [],
      },
      {
        id: "f-2",
        kind: "ridePhoto",
        uploadedByUserId: ADMIN,
        ridePhotos: [],
      },
    ]);
    await schedule({ ...base, photoFileIds: ["f-2", "f-1"] }, ADMIN);
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          photos: {
            deleteMany: {},
            create: [
              { fileId: "f-2", position: 0 },
              { fileId: "f-1", position: 1 },
            ],
          },
        },
      }),
    );
  });

  it.each([
    [
      "another kind",
      { kind: "trishawPhoto", uploadedByUserId: ADMIN, ridePhotos: [] },
    ],
    [
      "someone else's upload",
      { kind: "ridePhoto", uploadedByUserId: "user-x", ridePhotos: [] },
    ],
    [
      "another ride's photo",
      {
        kind: "ridePhoto",
        uploadedByUserId: ADMIN,
        ridePhotos: [{ rideId: "ride-9" }],
      },
    ],
  ])("refuses %s as a photo", async (_label, file) => {
    db.storedFile.findMany.mockResolvedValue([{ id: "f-1", ...file }]);
    expect(
      await codeOf(schedule({ ...base, photoFileIds: ["f-1"] }, ADMIN)),
    ).toBe("invalidFile");
    expect(db.ride.create).not.toHaveBeenCalled();
  });
});

describe("setRidePhotos", () => {
  it("keeps the ride's own photos, whoever uploaded them, and adds the actor's", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ photos: [{ fileId: "f-1", position: 0 }] }),
    );
    db.storedFile.findMany.mockResolvedValue([
      {
        id: "f-1",
        kind: "ridePhoto",
        uploadedByUserId: "user-x",
        ridePhotos: [{ rideId: "ride-1" }],
      },
      {
        id: "f-2",
        kind: "ridePhoto",
        uploadedByUserId: ADMIN,
        ridePhotos: [],
      },
    ]);
    expect(
      await rides.setRidePhotos(
        { rideId: "ride-1", fileIds: ["f-2", "f-1"] },
        ADMIN,
      ),
    ).toBe(true);
    expect(logTypes()).toEqual(["edited"]);
  });

  it("refuses photos on a ride that is not an event", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ model: "pleasure" }));
    expect(
      await codeOf(
        rides.setRidePhotos({ rideId: "ride-1", fileIds: ["f-1"] }, ADMIN),
      ),
    ).toBe("photosEventOnly");
  });
});

describe("photo attachment", () => {
  const own = (id: string) => ({
    id,
    kind: "ridePhoto",
    uploadedByUserId: ADMIN,
    ridePhotos: [],
  });

  it("lets a removed photo rejoin its ride, so Undo works", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    db.storedFile.findMany.mockResolvedValue([own("f-1")]);
    expect(
      await rides.setRidePhotos({ rideId: "ride-1", fileIds: ["f-1"] }, ADMIN),
    ).toBe(true);
  });

  it("refuses a photo another ride claimed first", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    db.storedFile.findMany.mockResolvedValue([own("f-1")]);
    db.ride.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    expect(
      await codeOf(
        rides.setRidePhotos({ rideId: "ride-1", fileIds: ["f-1"] }, ADMIN),
      ),
    ).toBe("invalidFile");
  });
});

describe("photoReadRule", () => {
  it("lets the admins of the ride's chapter read a photo on a ride", async () => {
    db.storedFile.findUnique.mockResolvedValue({
      id: "f-1",
      kind: "ridePhoto",
      uploadedByUserId: ADMIN,
      ridePhotos: [
        { ride: { chapterId: CHAPTER, chapter: { countryId: "de" } } },
      ],
    });
    expect((await rides.photoReadRule("f-1"))?.rule).toEqual({
      kind: "members",
      chapterIds: [CHAPTER],
      roles: ["admin"],
      admins: {
        chapters: [{ chapterId: CHAPTER, countryId: "de" }],
        countryIds: [],
      },
    });
  });

  it("lets only the uploader read a photo not on a ride yet", async () => {
    db.storedFile.findUnique.mockResolvedValue({
      id: "f-1",
      kind: "ridePhoto",
      uploadedByUserId: ADMIN,
      ridePhotos: [],
    });
    expect((await rides.photoReadRule("f-1"))?.rule).toEqual({
      kind: "uploader",
      userId: ADMIN,
    });
  });

  it("leaves every other kind of file to the fleet", async () => {
    db.storedFile.findUnique.mockResolvedValue({
      id: "f-1",
      kind: "trishawPhoto",
      ridePhotos: [],
    });
    expect(await rides.photoReadRule("f-1")).toBeNull();
  });
});

describe("listRidesForList", () => {
  const NOW = new Date("2026-10-06T12:00:00Z");
  const row = (id: string, startsAt: string) => ({
    id,
    startsAt: new Date(startsAt),
  });

  it("opens with the last three rides, oldest first, then a page of what is coming", async () => {
    db.ride.findMany
      .mockResolvedValueOnce([
        row("past-3", "2026-10-05T10:00:00Z"),
        row("past-2", "2026-10-04T10:00:00Z"),
      ])
      .mockResolvedValueOnce([
        row("next-1", "2026-10-07T10:00:00Z"),
        row("next-2", "2026-10-08T10:00:00Z"),
        row("next-3", "2026-10-09T10:00:00Z"),
      ]);
    const page = await rides.listRidesForList(
      { chapterIds: [CHAPTER], limit: 2 },
      NOW,
    );
    expect(page.past.map((ride) => ride.id)).toEqual(["past-2", "past-3"]);
    expect(page.rides.map((ride) => ride.id)).toEqual(["next-1", "next-2"]);
    expect(page.nextCursor).toBe(
      `${new Date("2026-10-08T10:00:00Z").getTime()}.next-2`,
    );
    expect(db.ride.findMany.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        where: { chapterId: { in: [CHAPTER] }, endsAt: { lte: NOW } },
        take: 3,
      }),
    );
  });

  it("continues after the cursor without the past", async () => {
    db.ride.findMany.mockResolvedValueOnce([]);
    const startsAt = new Date("2026-10-08T10:00:00Z");
    const page = await rides.listRidesForList(
      {
        chapterIds: [CHAPTER],
        cursor: `${startsAt.getTime()}.next-2`,
        limit: 2,
      },
      NOW,
    );
    expect(db.ride.findMany).toHaveBeenCalledTimes(1);
    expect(db.ride.findMany.mock.calls[0][0].where).toEqual({
      chapterId: { in: [CHAPTER] },
      endsAt: { gt: NOW },
      OR: [{ startsAt: { gt: startsAt } }, { startsAt, id: { gt: "next-2" } }],
    });
    expect(page).toEqual({ past: [], rides: [], nextCursor: null });
  });

  it("asks the database nothing without chapters", async () => {
    await rides.listRidesForList({ chapterIds: [] }, NOW);
    expect(db.ride.findMany).not.toHaveBeenCalled();
  });
});
