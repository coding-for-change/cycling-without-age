import { prisma } from "@/lib/prisma";
import { rides } from "@/features/rides";
import { domainCode } from "@/lib/domain-error";
import { transaction } from "@/lib/events";

const emitted: { type: string }[] = [];

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    ride: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rideTrishaw: { findMany: jest.fn() },
    rideAssignment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    rideRosterEntry: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
    },
    rideLogEntry: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
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
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  rideTrishaw: { findMany: jest.Mock };
  rideAssignment: {
    findUnique: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  rideRosterEntry: {
    findUnique: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
    aggregate: jest.Mock;
  };
  rideLogEntry: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
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
  note: null,
  trishaws: [],
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
  db.rideLogEntry.create.mock.calls.map(([args]) => args.data.type);
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
  db.rideRosterEntry.aggregate.mockResolvedValue({ _max: { position: null } });
  db.$queryRaw.mockResolvedValue([]);
});

describe("scheduleRide", () => {
  it("rejects a ride that ends before it starts", async () => {
    await expect(
      rides.scheduleRide(
        { ...base, endsAt: new Date("2026-09-08T07:00:00Z") },
        ADMIN,
      ),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("rejects a ride shorter than the minimum", async () => {
    await expect(
      rides.scheduleRide(
        { ...base, endsAt: new Date("2026-09-08T08:05:00Z") },
        ADMIN,
      ),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("rejects a ride longer than a day's work", async () => {
    await expect(
      rides.scheduleRide(
        { ...base, endsAt: new Date("2026-09-08T23:00:00Z") },
        ADMIN,
      ),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("schedules with no trishaw at all, asking the database nothing", async () => {
    await rides.scheduleRide(base, ADMIN);
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
      await codeOf(
        rides.scheduleRide({ ...base, trishawIds: [TRISHAW] }, ADMIN),
      ),
    ).toBe("trishawReserved");
    expect(db.ride.create).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("reserves several trishaws for one ride", async () => {
    await rides.scheduleRide(
      { ...base, trishawIds: [TRISHAW, "trishaw-2"] },
      ADMIN,
    );
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
      rides.scheduleRide({ ...base, trishawIds: [TRISHAW, TRISHAW] }, ADMIN),
    ).rejects.toThrow();
    expect(db.ride.create).not.toHaveBeenCalled();
  });

  it("locks the trishaws and writes inside one transaction", async () => {
    await rides.scheduleRide({ ...base, trishawIds: [TRISHAW] }, ADMIN);
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

  it("asks only about overlapping, non-cancelled rides", async () => {
    await rides.scheduleRide({ ...base, trishawIds: [TRISHAW] }, ADMIN);
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
    await rides.scheduleRide(base, ADMIN);
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
      const ride = await rides.scheduleRide(trip, ADMIN);
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
      await rides.scheduleRide(trip, ADMIN);
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
      expect(await codeOf(rides.scheduleRide(trip, ADMIN))).toBe(
        "trishawReserved",
      );
      expect(db.ride.create).not.toHaveBeenCalled();
    });

    it("is for functional rides only", async () => {
      await expect(
        rides.scheduleRide({ ...trip, model: "event" }, ADMIN),
      ).rejects.toThrow();
      expect(db.ride.create).not.toHaveBeenCalled();
    });

    it("cannot start back before it arrived", async () => {
      await expect(
        rides.scheduleRide(
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

describe("rescheduleRideAt", () => {
  // The ride runs 10:00–12:00 Berlin time (08:00–10:00 UTC).
  it("keeps what the patch leaves out, as read under the lock", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.rescheduleRideAt("ride-1", { durationMinutes: 60 }, ADMIN);
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
    await rides.rescheduleRideAt("ride-1", { durationMinutes: 90 }, ADMIN);
    expect(db.ride.update.mock.calls[0][0].data).toEqual({
      startsAt: new Date("2026-09-08T09:00:00Z"),
      endsAt: new Date("2026-09-08T10:30:00Z"),
    });
  });

  it("says whether anything moved", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(
      (await rides.rescheduleRideAt("ride-1", { start: "10:00" }, ADMIN))
        .changed,
    ).toBe(false);
    expect(
      (await rides.rescheduleRideAt("ride-1", { start: "11:00" }, ADMIN))
        .changed,
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
    await rides.updateRideDetails("ride-1", { model: "event" }, ADMIN);
    expect(db.ride.update.mock.calls[0][0].data).toEqual({
      model: "event",
      destinationName: null,
    });
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
    await rides.scheduleRide(base, ADMIN);
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
      db.rideRosterEntry.findUnique.mock.invocationCallOrder[0],
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
  beforeEach(() => db.ride.findUnique.mockResolvedValue(scheduled()));

  it("appends a rider to the end of the roster", async () => {
    db.rideRosterEntry.findUnique.mockResolvedValue(null);
    db.rideRosterEntry.aggregate.mockResolvedValue({ _max: { position: 1 } });
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
    db.rideRosterEntry.findUnique.mockResolvedValue({ id: "entry-1" });
    expect(await rides.bookRider("ride-1", "passenger-1", ADMIN)).toBe(false);
    expect(db.rideRosterEntry.create).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("removes a rider once, with one event", async () => {
    db.rideRosterEntry.findUnique.mockResolvedValue({
      id: "entry-1",
      passenger: { firstName: "Erna", lastName: "Huber" },
    });
    await rides.cancelBooking("ride-1", "passenger-1", ADMIN);
    expect(db.rideRosterEntry.deleteMany).toHaveBeenCalledWith({
      where: { rideId: "ride-1", passengerId: "passenger-1" },
    });
    expect(eventTypes()).toEqual(["ride.riderRemoved"]);
  });

  it("records who assigned a pilot, and that it was not self sign-up", async () => {
    db.rideAssignment.findUnique.mockResolvedValue(null);
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
    db.rideAssignment.findUnique.mockResolvedValue(null);
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
    db.rideAssignment.findUnique.mockResolvedValue({ id: "assignment-1" });
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
    db.rideAssignment.findUnique.mockResolvedValueOnce(null);
    expect(await rides.unassignVolunteer("ride-1", "user-1", ADMIN)).toBe(
      false,
    );
    db.rideAssignment.findUnique.mockResolvedValueOnce({
      id: "assignment-1",
      user: { name: "Pernille" },
    });
    await rides.unassignVolunteer("ride-1", "user-1", ADMIN);
    expect(eventTypes()).toEqual(["ride.pilotUnassigned"]);
  });
});

describe("who a ride concerns", () => {
  it("is its pilots and every account managing or being one of its riders", async () => {
    db.ride.findUnique.mockResolvedValue({
      chapterId: CHAPTER,
      assignments: [{ userId: "pilot-1" }, { userId: "pilot-1" }],
      roster: [
        { passenger: { managedByUserId: "carer-1", userId: null } },
        { passenger: { managedByUserId: "carer-1", userId: "rider-2" } },
      ],
    });
    expect(await rides.listRideParticipants("ride-1")).toEqual({
      chapterId: CHAPTER,
      pilotUserIds: ["pilot-1"],
      riderAccountUserIds: ["carer-1", "rider-2"],
    });
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
