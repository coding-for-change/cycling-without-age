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
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    rideTrishaw: { findMany: jest.fn() },
    rideAssignment: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    rideRosterEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    rideDebrief: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
    member: { findMany: jest.fn() },
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
    updateMany: jest.Mock;
    delete: jest.Mock;
  };
  rideTrishaw: { findMany: jest.Mock };
  rideAssignment: {
    findMany: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  rideRosterEntry: {
    findMany: jest.Mock;
    create: jest.Mock;
    createMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  rideDebrief: {
    upsert: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
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
  member: { findMany: jest.Mock };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

const CHAPTER = "chapter-muenchen";
const UNSWEPT = {
  staffingCheckedAt: null,
  riderReminderSentAt: null,
  volunteerReminderSentAt: null,
  demandCheckedAt: null,
};
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

  const ahead = {
    ...base,
    startsAt: new Date(Date.now() + 86_400_000),
    endsAt: new Date(Date.now() + 90_000_000),
  };

  it("stamps an event announced as it is scheduled", async () => {
    await schedule({ ...ahead, model: "event", announced: true }, ADMIN);
    expect(db.ride.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        announced: true,
        announcedAt: expect.any(Date),
      }),
    );
    expect(eventTypes()).toContain("ride.announced");
    await schedule(ahead, ADMIN);
    expect(db.ride.create.mock.calls[1][0].data.announcedAt).toBeNull();
  });

  it("counts a ride scheduled inside its staffing window as checked", async () => {
    const lead = { staffingLeadHours: 48 };
    await rides.scheduleRide(rideInput.parse(ahead), ADMIN, lead);
    expect(db.ride.create.mock.calls[0][0].data.staffingCheckedAt).toEqual(
      expect.any(Date),
    );
    await rides.scheduleRide(
      rideInput.parse({
        ...ahead,
        startsAt: new Date(Date.now() + 72 * 3_600_000),
        endsAt: new Date(Date.now() + 74 * 3_600_000),
      }),
      ADMIN,
      lead,
    );
    expect(db.ride.create.mock.calls[1][0].data.staffingCheckedAt).toBeNull();
  });

  // The admin adding riders right after scheduling is not told it is empty.
  it("counts a ride scheduled inside its demand window as checked", async () => {
    await rides.scheduleRide(rideInput.parse(ahead), ADMIN, {
      demandLeadHours: 24,
    });
    expect(db.ride.create.mock.calls[0][0].data).toMatchObject({
      demandCheckedAt: expect.any(Date),
      staffingCheckedAt: null,
    });
    await rides.scheduleRide(rideInput.parse(ahead), ADMIN, {
      demandLeadHours: 2,
    });
    expect(db.ride.create.mock.calls[1][0].data.demandCheckedAt).toBeNull();
  });

  // An admin writing yesterday's ride into the calendar tells nobody about it.
  it("offers and announces only a ride still ahead", async () => {
    const offered = async (input: RideInput) => {
      emitted.length = 0;
      await rides.scheduleRide(rideInput.parse(input), ADMIN, {
        opensForSignUp: true,
      });
      return eventTypes();
    };
    expect(
      await offered({ ...ahead, model: "event", announced: true }),
    ).toEqual(expect.arrayContaining(["ride.opened", "ride.announced"]));
    const past = await offered({ ...base, model: "event", announced: true });
    expect(past).not.toContain("ride.opened");
    expect(past).not.toContain("ride.announced");
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
      expect.objectContaining({ data: { ...later, ...UNSWEPT } }),
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
      expect.objectContaining({
        where: { id: "ride-1" },
        data: { ...later, ...UNSWEPT },
      }),
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
      ["ride-there", { ...nextDay, ...UNSWEPT }],
      [
        "ride-back",
        {
          startsAt: new Date("2026-09-09T09:30:00Z"),
          endsAt: new Date("2026-09-09T10:00:00Z"),
          ...UNSWEPT,
        },
      ],
    ]);
    expect(eventTypes()).toEqual(["ride.rescheduled", "ride.rescheduled"]);
    expect(
      emitted.map((event) => (event as unknown as { pair: unknown }).pair),
    ).toEqual([
      { role: "lead", otherRideId: "ride-back" },
      { role: "follow", otherRideId: "ride-there" },
    ]);
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
      ...UNSWEPT,
    });
    // Only the way back's start moved: only it is reminded and asked again.
    expect(db.ride.update.mock.calls[0][0].data).toEqual({
      startsAt: new Date("2026-09-08T08:00:00Z"),
      endsAt: new Date("2026-09-08T08:45:00Z"),
      staffingCheckedAt: null,
    });
    expect(
      db.rideRosterEntry.updateMany.mock.calls.map(
        ([args]) => args.where.rideId,
      ),
    ).toEqual(["ride-back"]);
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
          staffingCheckedAt: null,
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
      staffingCheckedAt: null,
    });
  });

  // A new end is no news: nobody is reminded again and no answer is undone.
  it("reminds again and asks again only when the start moves", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.rescheduleRide("ride-1", { durationMinutes: 60 }, ADMIN);
    expect(db.rideRosterEntry.updateMany).not.toHaveBeenCalled();

    await rides.rescheduleRide("ride-1", { start: "11:00" }, ADMIN);
    expect(db.ride.update.mock.calls[1][0].data).toMatchObject(UNSWEPT);
    expect(db.rideRosterEntry.updateMany).toHaveBeenCalledWith({
      where: {
        passengerId: { not: null },
        rideId: "ride-1",
        attendance: { in: ["confirmed", "checkedIn"] },
      },
      data: { attendance: "booked", confirmedAt: null, checkedInAt: null },
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
  // Booking a seat is for events only: one that becomes another model is no
  // longer offered, and turning it back into an event does not offer it again.
  it("takes an event off the riders' list when it becomes another model", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ announced: true, title: null, capacity: null }),
    );
    await rides.updateRideDetails("ride-1", { model: "pleasure" }, ADMIN);
    expect(db.ride.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ model: "pleasure", announced: false }),
    );
  });

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
    // The way there speaks for both, so the trip is announced once.
    expect(
      emitted.map((event) => (event as unknown as { pair: unknown }).pair),
    ).toEqual([
      { role: "lead", otherRideId: "ride-back" },
      { role: "follow", otherRideId: "ride-1" },
    ]);
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
    expect(emitted[0]).toEqual(expect.objectContaining({ self: false }));
  });

  // The admins hear about a seat given up only when the rider's side gave it up.
  it("marks a seat given up by the rider's own account", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        roster: [
          {
            id: "entry-1",
            position: 0,
            passenger: {
              id: "passenger-1",
              managedByUserId: "carer-1",
              userId: null,
            },
          },
        ],
      }),
    );
    await rides.cancelBooking("ride-1", "passenger-1", "carer-1");
    expect(emitted[0]).toEqual(expect.objectContaining({ self: true }));
  });

  it("gives up the seats still ahead of a rider who is about to go", async () => {
    db.rideRosterEntry.findMany.mockResolvedValue([
      { rideId: "ride-1", passengerId: "passenger-1" },
    ]);
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: riders("passenger-1") }),
    );
    const now = new Date("2026-10-20T08:00:00Z");
    expect(
      await rides.cancelUpcomingBookings(["passenger-1"], "carer-1", now),
    ).toBe(1);
    expect(db.rideRosterEntry.findMany).toHaveBeenCalledWith({
      where: {
        passengerId: { in: ["passenger-1"] },
        attendance: { not: "cancelled" },
        ride: { status: "scheduled", endsAt: { gt: now } },
      },
      select: { rideId: true, passengerId: true },
    });
    expect(eventTypes()).toEqual(["ride.riderRemoved"]);
  });

  it("reads nothing for no riders", async () => {
    expect(await rides.cancelUpcomingBookings([], ADMIN)).toBe(0);
    expect(db.rideRosterEntry.findMany).not.toHaveBeenCalled();
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
    const now = new Date("2026-09-07T09:00:00Z");
    await rides.getRideForPassengers("ride-1", ["passenger-1"], now);
    const args = db.ride.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({
      id: "ride-1",
      OR: [
        {
          roster: {
            some: {
              passengerId: { in: ["passenger-1"] },
              attendance: { not: "cancelled" },
            },
          },
        },
        {
          status: "scheduled",
          startsAt: { gt: now },
          roster: { some: { passengerId: { in: ["passenger-1"] } } },
        },
      ],
    });
    expect(args.select.roster.where).toEqual({
      passengerId: { in: ["passenger-1"] },
    });
    expect(args.select.note).toBeUndefined();
    expect(args.select.cancellationNote).toBeUndefined();
    expect(userOf(args.select)).toEqual({
      select: { ...noEmail.select, phoneNumber: true },
    });
  });

  // A seat given up opens the ride's page only while the seat can be taken back.
  it("opens a ride whose seat was given up only while it is ahead", async () => {
    const now = new Date("2026-09-07T09:00:00Z");
    db.ride.findFirst.mockResolvedValue(null);
    expect(await rides.passengersCanOpen("ride-1", ["passenger-1"], now)).toBe(
      false,
    );
    expect(db.ride.findFirst.mock.calls[0][0].where.OR[1]).toEqual({
      status: "scheduled",
      startsAt: { gt: now },
      roster: { some: { passengerId: { in: ["passenger-1"] } } },
    });
  });

  it("names everyone a change concerns, once", async () => {
    db.ride.findUnique.mockResolvedValue({
      chapterId: "chapter-muenchen",
      assignments: [{ userId: "pilot-1" }, { userId: "pilot-1" }],
      roster: [
        { passenger: { managedByUserId: "carer-1", userId: null } },
        { passenger: { managedByUserId: "carer-1", userId: "rider-2" } },
      ],
    });
    expect(await rides.listRideParticipants("ride-1")).toEqual({
      chapterId: "chapter-muenchen",
      pilotUserIds: ["pilot-1"],
      riderCount: 2,
      riderAccountUserIds: ["carer-1", "rider-2"],
    });
  });

  // A pilot who left the chapter, or lost the role, is told nothing more.
  it("counts only pilots who still pilot in the ride's chapter, in one query", async () => {
    db.ride.findUnique.mockResolvedValue({
      chapterId: "chapter-muenchen",
      assignments: [],
      roster: [],
    });
    await rides.listRideParticipants("ride-1");
    expect(db.ride.findUnique).toHaveBeenCalledTimes(1);
    expect(
      db.ride.findUnique.mock.calls[0][0].select.assignments.where,
    ).toEqual({
      user: {
        members: {
          some: {
            role: { contains: "pilot" },
            organization: { rides: { some: { id: "ride-1" } } },
          },
        },
      },
    });
  });

  // A demoted co-pilot keeps the assignment row but no longer rides along.
  it("shows a member only the crew still piloting in the ride's chapter", async () => {
    db.ride.findFirst.mockResolvedValue({
      id: "ride-1",
      chapterId: "chapter-muenchen",
      assignments: [
        { role: "pilot", user: { id: "pilot-1" } },
        { role: "pilot", user: { id: "demoted" } },
      ],
    });
    db.member.findMany.mockResolvedValue([
      { organizationId: "chapter-muenchen", userId: "pilot-1" },
    ]);
    const ride = await rides.getRideForPilot("ride-1", "pilot-1");
    expect(ride!.assignments.map((a) => a.user.id)).toEqual(["pilot-1"]);
    expect(db.member.findMany.mock.calls[0][0].where).toEqual({
      organizationId: { in: ["chapter-muenchen"] },
      userId: { in: ["pilot-1", "demoted"] },
      role: { contains: "pilot" },
    });
  });
});

describe("isFinishable", () => {
  const NOW = new Date("2026-10-07T12:00:00Z");
  const ride = (overrides: Record<string, unknown>) => ({
    status: "scheduled",
    startsAt: new Date("2026-10-07T09:00:00Z"),
    endsAt: new Date("2026-10-07T11:00:00Z"),
    ...overrides,
  });

  it("opens once the ride started and closes a day after it ended", () => {
    expect(rides.isFinishable(ride({}), NOW)).toBe(true);
    expect(
      rides.isFinishable(
        ride({ startsAt: new Date("2026-10-07T13:00:00Z") }),
        NOW,
      ),
    ).toBe(false);
    expect(
      rides.isFinishable(
        ride({ endsAt: new Date("2026-10-06T11:59:00Z") }),
        NOW,
      ),
    ).toBe(false);
    expect(rides.isFinishable(ride({ status: "cancelled" }), NOW)).toBe(false);
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
    expect(selectOf()._count).toEqual({
      select: { roster: { where: { attendance: { not: "cancelled" } } } },
    });
  });

  it("gives the admin calendar a count and no names", async () => {
    await rides.listRidesInRange(["chapter-muenchen"], FROM, TO);
    expect(selectOf().roster).toBeUndefined();
  });

  // A feed leaves the app for someone else's calendar servers.
  it("gives a calendar feed only the reader's own riders, and no count", async () => {
    await rides.listRidesForCalendarFeed(
      "user-1",
      { pilotChapterIds: [], passengerIds: ["passenger-1"] },
      FROM,
      TO,
      FROM,
    );
    const select = selectOf();
    expect(select.roster.where).toEqual({
      passengerId: { in: ["passenger-1"] },
      attendance: { not: "cancelled" },
    });
    expect(Object.keys(select.roster.select.passenger.select)).not.toContain(
      "lastName",
    );
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
  const riding = {
    roster: {
      some: {
        passengerId: { in: ["passenger-1"] },
        attendance: { not: "cancelled" },
      },
    },
  };
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

  const stillPiloting = (...userIds: string[]) =>
    db.member.findMany.mockResolvedValue(
      userIds.map((userId) => ({ organizationId: CHAPTER, userId })),
    );

  it("refuses fewer pilots needed than are already on the ride", async () => {
    stillPiloting("pilot-1", "pilot-2");
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
    stillPiloting("pilot-1", "pilot-2");
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

  // The demoted pilot stays listed, but the seat is free for the admin too,
  // as it is for a pilot signing up.
  it("frees the seat of a pilot who no longer pilots in the chapter", async () => {
    stillPiloting();
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        model: "pleasure",
        assignments: [{ role: "pilot", user: { id: "pilot-1" } }],
      }),
    );
    expect(await rides.assignVolunteer("ride-1", "pilot-2", ADMIN)).toBe(true);
  });

  it("marks the pilots an admin sees by whether they still pilot", async () => {
    stillPiloting("pilot-1");
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        assignments: [
          { role: "pilot", user: { id: "pilot-1" } },
          { role: "pilot", user: { id: "pilot-2" } },
        ],
      }),
    );
    const ride = await rides.getRideDetail("ride-1");
    expect(
      ride?.assignments.map(({ user, stillPiloting }) => [
        user.id,
        stillPiloting,
      ]),
    ).toEqual([
      ["pilot-1", true],
      ["pilot-2", false],
    ]);
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

describe("pilots signing up themselves", () => {
  const BEFORE = new Date("2026-09-01T08:00:00Z");
  const pilot = (id: string) => ({ role: "pilot", user: { id } });

  it("locks the ride before it counts the pilots", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.selfAssign("ride-1", "pilot-1", BEFORE);
    expect(lockedSql()[0]).toContain("FOR UPDATE");
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      db.ride.findUnique.mock.invocationCallOrder.at(-1)!,
    );
    expect(db.rideAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          rideId: "ride-1",
          userId: "pilot-1",
          role: "pilot",
          assignedByUserId: null,
        },
      }),
    );
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "ride.pilotAssigned",
        userId: "pilot-1",
        self: true,
        actorUserId: "pilot-1",
      }),
    ]);
  });

  // Two pilots for the last place: the second reads the first one's seat.
  it("refuses once the ride has all its pilots", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ assignments: [pilot("pilot-2")] }),
    );
    db.member.findMany.mockResolvedValue([
      { organizationId: CHAPTER, userId: "pilot-2" },
    ]);
    expect(await codeOf(rides.selfAssign("ride-1", "pilot-1", BEFORE))).toBe(
      "rideFullyStaffed",
    );
    expect(db.rideAssignment.create).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  // A demoted pilot keeps the assignment row, but not the seat.
  it("does not count a pilot who no longer pilots in the chapter", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ assignments: [pilot("pilot-2")] }),
    );
    db.member.findMany.mockResolvedValue([]);
    expect(await rides.selfAssign("ride-1", "pilot-1", BEFORE)).toBe(true);
    expect(db.member.findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        organizationId: { in: [CHAPTER] },
        userId: { in: ["pilot-2"] },
      }),
    );
  });

  it("refuses a ride that has started or is no longer going ahead", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(
      await codeOf(
        rides.selfAssign("ride-1", "pilot-1", new Date("2026-09-08T09:00:00Z")),
      ),
    ).toBe("rideClosed");
    db.ride.findUnique.mockResolvedValue(scheduled({ status: "cancelled" }));
    expect(await codeOf(rides.selfAssign("ride-1", "pilot-1", BEFORE))).toBe(
      "rideClosed",
    );
  });

  it("signs up the same pilot once, quietly", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ requiredPilots: 2, assignments: [pilot("pilot-1")] }),
    );
    expect(await rides.selfAssign("ride-1", "pilot-1", BEFORE)).toBe(false);
    expect(emitted).toEqual([]);
  });

  it("lets a pilot step back only from their own seat", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ assignments: [pilot("pilot-2")] }),
    );
    expect(await codeOf(rides.withdraw("ride-1", "pilot-1", 48, BEFORE))).toBe(
      "notAssigned",
    );
    expect(db.rideAssignment.deleteMany).not.toHaveBeenCalled();
  });

  it("sends a pilot to the phone inside the staffing window", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ assignments: [pilot("pilot-1")] }),
    );
    expect(
      await codeOf(
        rides.withdraw(
          "ride-1",
          "pilot-1",
          48,
          new Date("2026-09-07T08:00:00Z"),
        ),
      ),
    ).toBe("tooLateToWithdraw");
    await rides.withdraw("ride-1", "pilot-1", 48, BEFORE);
    expect(db.rideAssignment.deleteMany).toHaveBeenCalledWith({
      where: { rideId: "ride-1", userId: "pilot-1", role: "pilot" },
    });
    expect(emitted).toEqual([
      expect.objectContaining({ type: "ride.pilotUnassigned", self: true }),
    ]);
  });
});

describe("a pilot taking a round trip", () => {
  const BEFORE = new Date("2026-09-01T08:00:00Z");
  const pilot = (id: string) => ({ role: "pilot", user: { id } });
  const there = (overrides: Record<string, unknown> = {}) =>
    scheduled({
      id: "ride-there",
      model: "functional",
      endsAt: new Date("2026-09-08T08:30:00Z"),
      returnLeg: { id: "ride-back", status: "scheduled" },
      ...overrides,
    });
  const back = (overrides: Record<string, unknown> = {}) =>
    scheduled({
      id: "ride-back",
      model: "functional",
      startsAt: new Date("2026-09-08T15:00:00Z"),
      endsAt: new Date("2026-09-08T15:30:00Z"),
      returnLegOf: { id: "ride-there", status: "scheduled" },
      ...overrides,
    });
  const legs = (...rows: Record<string, unknown>[]) =>
    db.ride.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(rows.find((row) => row.id === where.id) ?? null),
    );
  const assignedTo = () =>
    db.rideAssignment.create.mock.calls.map(([args]) => args.data.rideId);
  const pairs = () =>
    emitted.map((event) => [
      (event as { rideId?: string }).rideId,
      (event as { pair?: { role: string } | null }).pair?.role ?? null,
    ]);

  beforeEach(() => db.member.findMany.mockResolvedValue([]));

  it("takes the way back with the way there, announced once", async () => {
    legs(there(), back());
    await rides.selfAssign("ride-there", "pilot-1", BEFORE);
    expect(assignedTo()).toEqual(["ride-there", "ride-back"]);
    expect(pairs()).toEqual([
      ["ride-there", "lead"],
      ["ride-back", "follow"],
    ]);
  });

  it("takes the way there with the way back, still led by the way there", async () => {
    legs(there(), back());
    await rides.selfAssign("ride-back", "pilot-1", BEFORE);
    expect(assignedTo()).toEqual(["ride-back", "ride-there"]);
    expect(pairs()).toEqual([
      ["ride-back", "follow"],
      ["ride-there", "lead"],
    ]);
  });

  it("leaves a leg that has its pilots or is cancelled", async () => {
    db.member.findMany.mockResolvedValue([
      { organizationId: CHAPTER, userId: "pilot-2" },
    ]);
    legs(there(), back({ assignments: [pilot("pilot-2")] }));
    await rides.selfAssign("ride-there", "pilot-1", BEFORE);
    expect(assignedTo()).toEqual(["ride-there"]);
    expect(pairs()).toEqual([["ride-there", null]]);

    jest.clearAllMocks();
    emitted.length = 0;
    legs(
      there({ returnLeg: { id: "ride-back", status: "cancelled" } }),
      back({ status: "cancelled" }),
    );
    await rides.selfAssign("ride-there", "pilot-1", BEFORE);
    expect(assignedTo()).toEqual(["ride-there"]);
  });

  it("steps back from both legs, but not from one inside its window", async () => {
    legs(
      there({ assignments: [pilot("pilot-1")] }),
      back({ assignments: [pilot("pilot-1")] }),
    );
    await rides.withdraw("ride-back", "pilot-1", 48, BEFORE);
    expect(
      db.rideAssignment.deleteMany.mock.calls.map(
        ([args]) => args.where.rideId,
      ),
    ).toEqual(["ride-back", "ride-there"]);
    expect(pairs()).toEqual([
      ["ride-back", "follow"],
      ["ride-there", "lead"],
    ]);

    jest.clearAllMocks();
    emitted.length = 0;
    legs(
      there({ assignments: [pilot("pilot-1")] }),
      back({
        startsAt: new Date("2026-09-10T15:00:00Z"),
        endsAt: new Date("2026-09-10T15:30:00Z"),
        assignments: [pilot("pilot-1")],
      }),
    );
    await rides.withdraw(
      "ride-back",
      "pilot-1",
      48,
      new Date("2026-09-07T12:00:00Z"),
    );
    expect(
      db.rideAssignment.deleteMany.mock.calls.map(
        ([args]) => args.where.rideId,
      ),
    ).toEqual(["ride-back"]);
  });
});

describe("what a pilot sees before signing up", () => {
  it("lists open rides without a name or a number on them", async () => {
    db.ride.findMany.mockResolvedValue([]);
    await rides.listOpenRidesForPilot("pilot-1", [CHAPTER]);
    const args = db.ride.findMany.mock.calls[0][0];
    expect(args.where).toEqual(
      expect.objectContaining({
        chapterId: { in: [CHAPTER] },
        status: "scheduled",
        assignments: { none: { userId: "pilot-1" } },
      }),
    );
    expect(args.select.roster).toBeUndefined();
    expect(args.select.assignments).toEqual({
      where: { role: "pilot" },
      select: { userId: true },
    });
    expect(args.select.note).toBeUndefined();
    expect(JSON.stringify(args.select)).not.toMatch(/phone|email|firstName/);
  });

  it("leaves out rides that have all their pilots", async () => {
    const row = (id: string, requiredPilots: number, pilotIds: string[]) => ({
      id,
      chapterId: CHAPTER,
      requiredPilots,
      _count: { roster: 0 },
      assignments: pilotIds.map((userId) => ({ userId })),
    });
    db.ride.findMany.mockResolvedValue([
      row("full", 1, ["pilot-2"]),
      row("open", 2, ["pilot-2"]),
      row("demoted", 1, ["pilot-3"]),
    ]);
    db.member.findMany.mockResolvedValue([
      { organizationId: CHAPTER, userId: "pilot-2" },
    ]);
    const open = await rides.listOpenRidesForPilot("pilot-1", [CHAPTER]);
    expect(open.map((ride) => ride.id)).toEqual(["open", "demoted"]);
    expect(open.map((ride) => ride._count.assignments)).toEqual([1, 0]);
    expect(open[0]).not.toHaveProperty("assignments");
  });

  // A busy chapter's staffed rides fill a whole batch; the open one behind
  // them still shows, and rides sharing a start time are not skipped.
  it("reads on past a full batch of staffed rides", async () => {
    const at = new Date("2026-09-10T08:00:00Z");
    const staffed = Array.from({ length: 60 }, (_, index) => ({
      id: `staffed-${String(index).padStart(2, "0")}`,
      chapterId: CHAPTER,
      startsAt: at,
      requiredPilots: 1,
      _count: { roster: 0 },
      assignments: [{ userId: "pilot-2" }],
    }));
    db.ride.findMany.mockResolvedValueOnce(staffed).mockResolvedValueOnce([
      {
        id: "open",
        chapterId: CHAPTER,
        startsAt: at,
        requiredPilots: 1,
        _count: { roster: 0 },
        assignments: [],
      },
    ]);
    db.member.findMany.mockResolvedValue([
      { organizationId: CHAPTER, userId: "pilot-2" },
    ]);
    const open = await rides.listOpenRidesForPilot("pilot-1", [CHAPTER]);
    expect(open.map((ride) => ride.id)).toEqual(["open"]);
    expect(db.ride.findMany).toHaveBeenCalledTimes(2);
    expect(db.ride.findMany.mock.calls[1][0].where.OR).toEqual([
      { startsAt: { gt: at } },
      { startsAt: at, id: { gt: "staffed-59" } },
    ]);
  });

  it("asks nothing for a pilot of no chapter", async () => {
    expect(await rides.listOpenRidesForPilot("pilot-1", [])).toEqual([]);
    expect(await rides.getOpenRideForPilot("ride-1", [])).toBeNull();
    expect(db.ride.findMany).not.toHaveBeenCalled();
    expect(db.ride.findFirst).not.toHaveBeenCalled();
  });
});

describe("the staffing check", () => {
  const NOW = new Date("2026-09-07T09:00:00Z");

  it("warns once about a ride still short, and stamps it in the same transaction", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ requiredPilots: 2 }));
    expect(await rides.checkStaffing("ride-1", NOW)).toBe(true);
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { staffingCheckedAt: NOW } }),
    );
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "ride.understaffed",
        assigned: 0,
        required: 2,
        actorUserId: null,
      }),
    ]);
    expect((transaction as jest.Mock).mock.calls).toHaveLength(1);
  });

  it("stays quiet on a ride already checked", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ staffingCheckedAt: new Date("2026-09-07T08:00:00Z") }),
    );
    expect(await rides.checkStaffing("ride-1", NOW)).toBe(false);
    expect(db.ride.update).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("stamps a staffed ride without a warning", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ assignments: [{ role: "pilot", user: { id: "p" } }] }),
    );
    db.member.findMany.mockResolvedValue([
      { organizationId: CHAPTER, userId: "p" },
    ]);
    expect(await rides.checkStaffing("ride-1", NOW)).toBe(false);
    expect(db.ride.update).toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("warns about a ride whose only pilot no longer pilots", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ assignments: [{ role: "pilot", user: { id: "p" } }] }),
    );
    db.member.findMany.mockResolvedValue([]);
    expect(await rides.checkStaffing("ride-1", NOW)).toBe(true);
    expect(emitted).toEqual([
      expect.objectContaining({ type: "ride.understaffed", assigned: 0 }),
    ]);
  });

  // One outing, one warning: the way back is checked with the way there.
  it("warns once about a round trip short both ways", async () => {
    const legs = [
      scheduled({
        id: "ride-there",
        model: "functional",
        returnLeg: { id: "ride-back", status: "scheduled" },
      }),
      scheduled({
        id: "ride-back",
        model: "functional",
        startsAt: new Date("2026-09-08T15:00:00Z"),
        endsAt: new Date("2026-09-08T15:30:00Z"),
        returnLegOf: { id: "ride-there", status: "scheduled" },
      }),
    ];
    db.ride.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(legs.find((leg) => leg.id === where.id) ?? null),
    );
    expect(await rides.checkStaffing("ride-there", NOW)).toBe(true);
    expect(db.ride.update.mock.calls.map(([args]) => args.where.id)).toEqual([
      "ride-there",
      "ride-back",
    ]);
    expect(
      emitted.map((event) => [
        (event as { rideId?: string }).rideId,
        (event as { pair?: { role: string } | null }).pair?.role,
      ]),
    ).toEqual([
      ["ride-there", "lead"],
      ["ride-back", "follow"],
    ]);
  });

  it("leaves a way back to its way there while that one is still to check", async () => {
    await rides.listStaffingCandidates([CHAPTER], 48, NOW);
    expect(db.ride.findMany.mock.calls[0][0].where.NOT).toEqual({
      returnLegOf: {
        is: {
          status: "scheduled",
          startsAt: { gt: NOW },
          staffingCheckedAt: null,
        },
      },
    });
  });

  it("checks again the rides a pilot left by stepping back or losing the role", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        staffingCheckedAt: new Date("2026-09-01T08:00:00Z"),
        assignments: [{ role: "pilot", user: { id: "p" } }],
      }),
    );
    await rides.withdraw("ride-1", "p", 12, new Date("2026-09-05T08:00:00Z"));
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { staffingCheckedAt: null } }),
    );

    db.ride.updateMany.mockResolvedValue({ count: 2 });
    expect(await rides.reopenStaffingChecksOf("p", CHAPTER, NOW)).toBe(2);
    expect(db.ride.updateMany).toHaveBeenCalledWith({
      where: {
        chapterId: CHAPTER,
        status: "scheduled",
        startsAt: { gt: NOW },
        staffingCheckedAt: { not: null },
        assignments: { some: { userId: "p", role: "pilot" } },
      },
      data: { staffingCheckedAt: null },
    });
  });

  it("checks a moved ride again", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    await rides.rescheduleRide(
      "ride-1",
      {
        startsAt: new Date("2026-09-20T08:00:00Z"),
        endsAt: new Date("2026-09-20T10:00:00Z"),
      },
      ADMIN,
    );
    expect(db.ride.update.mock.calls[0][0].data.staffingCheckedAt).toBeNull();
  });
});

describe("booking seats on an announced event", () => {
  const BEFORE = new Date("2026-09-01T08:00:00Z");
  const announced = (overrides: Record<string, unknown> = {}) =>
    scheduled({ announced: true, capacity: 3, ...overrides });

  it("seats riders at the end of the roster, one event each", async () => {
    db.ride.findUnique.mockResolvedValue(
      announced({ roster: [{ position: 0, passenger: { id: "p-0" } }] }),
    );
    expect(
      await rides.bookSeats("ride-1", ["p-1", "p-2"], "carer", BEFORE),
    ).toBe(2);
    expect(
      db.rideRosterEntry.create.mock.calls.map(([args]) => args.data.position),
    ).toEqual([1, 2]);
    expect(eventTypes()).toEqual(["ride.riderBooked", "ride.riderBooked"]);
  });

  // The last two seats, wanted by a family of three: nobody is half seated.
  it("refuses a booking that would overfill the event, whole", async () => {
    db.ride.findUnique.mockResolvedValue(
      announced({ roster: [{ position: 0, passenger: { id: "p-0" } }] }),
    );
    expect(
      await codeOf(
        rides.bookSeats("ride-1", ["p-1", "p-2", "p-3"], "carer", BEFORE),
      ),
    ).toBe("rideFull");
    expect(db.rideRosterEntry.create).not.toHaveBeenCalled();
    expect(lockedSql()[0]).toContain("FOR UPDATE");
  });

  it("refuses an event that is not announced, or not an event", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ capacity: 3 }));
    expect(
      await codeOf(rides.bookSeats("ride-1", ["p-1"], "carer", BEFORE)),
    ).toBe("unknownRide");
    db.ride.findUnique.mockResolvedValue(announced({ model: "pleasure" }));
    expect(
      await codeOf(rides.bookSeats("ride-1", ["p-1"], "carer", BEFORE)),
    ).toBe("unknownRide");
  });

  it("only announces event rides", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ model: "pleasure" }));
    expect(await codeOf(rides.setAnnounced("ride-1", true, ADMIN))).toBe(
      "eventsOnly",
    );
    db.ride.findUnique.mockResolvedValue(scheduled({ announced: false }));
    expect(await rides.setAnnounced("ride-1", true, ADMIN, BEFORE)).toBe(true);
    expect(eventTypes()).toEqual(["ride.announced"]);
    expect(db.ride.update.mock.calls[0][0].data).toEqual({
      announced: true,
      announcedAt: BEFORE,
    });
  });

  it("refuses to announce an event that has started", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ announced: false }));
    expect(
      await codeOf(
        rides.setAnnounced(
          "ride-1",
          true,
          ADMIN,
          new Date("2026-09-08T09:00:00Z"),
        ),
      ),
    ).toBe("rideClosed");
    expect(
      await rides.setAnnounced(
        "ride-1",
        false,
        ADMIN,
        new Date("2026-09-08T09:00:00Z"),
      ),
    ).toBe(false);
  });

  // Taking an announcement back to fix a typo must not tell everyone twice.
  it("tells the riders only the first time an event is announced", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ announced: false, announcedAt: new Date(0) }),
    );
    expect(await rides.setAnnounced("ride-1", true, ADMIN, BEFORE)).toBe(true);
    expect(db.ride.update.mock.calls[0][0].data).toEqual({ announced: true });
    expect(emitted).toEqual([]);
  });

  it("leaves out an event every rider of its chapter is already booked on", async () => {
    db.ride.findMany.mockResolvedValue([
      { id: "fair", chapterId: CHAPTER },
      { id: "picnic", chapterId: CHAPTER },
      { id: "elsewhere", chapterId: "chapter-other" },
    ]);
    db.rideRosterEntry.findMany.mockResolvedValue([
      { rideId: "fair", passengerId: "p-1" },
      { rideId: "fair", passengerId: "p-2" },
      { rideId: "picnic", passengerId: "p-1" },
    ]);
    const events = await rides.listAnnouncedEvents(
      [
        { id: "p-1", chapterId: CHAPTER },
        { id: "p-2", chapterId: CHAPTER },
        { id: "p-3", chapterId: "chapter-other" },
      ],
      BEFORE,
    );
    expect(events.map((event) => event.id)).toEqual(["picnic", "elsewhere"]);
  });

  it("shows the public event without anyone's name", async () => {
    db.ride.findFirst.mockResolvedValue(null);
    await rides.getAnnouncedEvent("ride-1", [CHAPTER]);
    const args = db.ride.findFirst.mock.calls[0][0];
    expect(args.where).toEqual(
      expect.objectContaining({ model: "event", announced: true }),
    );
    expect(args.select.roster).toBeUndefined();
    expect(args.select.assignments).toBeUndefined();
  });
});

describe("seats, check-in and the closed roster", () => {
  const BEFORE = new Date("2026-09-07T09:00:00Z");
  const DOOR_OPEN = new Date("2026-09-08T06:30:00Z");
  const RIDING = new Date("2026-09-08T09:00:00Z");
  const NEXT_WEEK = new Date("2026-09-15T09:00:00Z");

  const entry = (overrides: Record<string, unknown> = {}) => ({
    id: "entry-1",
    position: 0,
    attendance: "booked",
    confirmedAt: null,
    checkedInAt: null,
    guestName: null,
    passenger: {
      id: "passenger-1",
      managedByUserId: "carer-1",
      userId: null,
    },
    ...overrides,
  });

  beforeEach(() => {
    db.rideRosterEntry.update.mockResolvedValue({ id: "entry-1" });
    db.rideRosterEntry.create.mockResolvedValue({ id: "walk-up-1" });
    db.rideRosterEntry.updateMany.mockResolvedValue({ count: 1 });
    db.rideAssignment.updateMany.mockResolvedValue({ count: 1 });
  });

  // A walk-up rides, so they take a seat everyone counts.
  it("counts every seat still taken, walk-ups included, in a ride's count", async () => {
    await rides.listRidesInRange([CHAPTER], BEFORE, NEXT_WEEK);
    expect(db.ride.findMany.mock.calls[0][0].select._count).toEqual({
      select: { roster: { where: { attendance: { not: "cancelled" } } } },
    });
  });

  it("never shows a walk-up to a rider's account", async () => {
    db.ride.findFirst.mockResolvedValue(null);
    await rides.getRideForPassengers("ride-1", ["passenger-1"]);
    const { where } = db.ride.findFirst.mock.calls[0][0].select.roster;
    expect(where).toEqual({ passengerId: { in: ["passenger-1"] } });
  });

  it("keeps a seat given up on the roster and frees it", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        roster: [entry(), entry({ id: "entry-2", passenger: { id: "p-2" } })],
      }),
    );
    expect(
      await rides.cancelSeat("ride-1", "passenger-1", "carer-1", BEFORE),
    ).toBe(true);
    expect(db.rideRosterEntry.deleteMany).not.toHaveBeenCalled();
    expect(db.rideRosterEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "entry-1" },
        data: {
          attendance: "cancelled",
          cancelledAt: BEFORE,
          confirmedAt: null,
        },
      }),
    );
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "ride.riderRemoved",
        self: true,
        rosterNowEmpty: false,
      }),
    ]);
  });

  it("tells the chapter when the last rider gives the seat up", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [entry()] }));
    await rides.cancelSeat("ride-1", "passenger-1", "carer-1", BEFORE);
    expect(emitted).toEqual([
      expect.objectContaining({ rosterNowEmpty: true }),
    ]);
  });

  it("gives a seat up on both legs of a round trip, as one message", async () => {
    const legs: Record<string, unknown> = {
      "ride-there": scheduled({
        id: "ride-there",
        model: "functional",
        returnLeg: { id: "ride-back", status: "scheduled" },
        roster: [entry()],
      }),
      "ride-back": scheduled({
        id: "ride-back",
        model: "functional",
        startsAt: new Date("2026-09-08T15:00:00Z"),
        endsAt: new Date("2026-09-08T16:00:00Z"),
        returnLegOf: { id: "ride-there", status: "scheduled" },
        roster: [entry({ id: "entry-back" })],
      }),
    };
    db.ride.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(legs[where.id]),
    );
    await rides.cancelSeat("ride-there", "passenger-1", "carer-1", BEFORE);
    expect(emitted).toEqual([
      expect.objectContaining({
        rideId: "ride-there",
        pair: { role: "lead", otherRideId: "ride-back" },
      }),
      expect.objectContaining({
        rideId: "ride-back",
        pair: { role: "follow", otherRideId: "ride-there" },
      }),
    ]);
  });

  // The way there empties, the way back still has someone: two messages.
  it("pairs the two legs only when both are left as empty", async () => {
    const rows: Record<string, unknown> = {
      "ride-there": scheduled({
        id: "ride-there",
        model: "functional",
        returnLeg: { id: "ride-back", status: "scheduled" },
        roster: [entry()],
      }),
      "ride-back": scheduled({
        id: "ride-back",
        model: "functional",
        startsAt: new Date("2026-09-08T15:00:00Z"),
        endsAt: new Date("2026-09-08T16:00:00Z"),
        returnLegOf: { id: "ride-there", status: "scheduled" },
        roster: [
          entry({ id: "entry-back" }),
          entry({ id: "e2", passenger: { id: "p-2" } }),
        ],
      }),
    };
    db.ride.findUnique.mockImplementation(({ where }) =>
      Promise.resolve(rows[where.id]),
    );
    await rides.cancelSeat("ride-there", "passenger-1", "carer-1", BEFORE);
    expect(emitted).toEqual([
      expect.objectContaining({
        rideId: "ride-there",
        rosterNowEmpty: true,
        pair: null,
      }),
      expect.objectContaining({
        rideId: "ride-back",
        rosterNowEmpty: false,
        pair: null,
      }),
    ]);
  });

  it("closes seat changes once the ride has started", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [entry()] }));
    expect(
      await codeOf(rides.cancelSeat("ride-1", "passenger-1", "c", RIDING)),
    ).toBe("rideClosed");
    expect(
      await codeOf(rides.confirmSeat("ride-1", "passenger-1", "c", RIDING)),
    ).toBe("rideClosed");
  });

  it("refuses a rider who is not on the ride", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(
      await codeOf(rides.confirmSeat("ride-1", "passenger-9", "c", BEFORE)),
    ).toBe("unknownPassenger");
  });

  it("confirms a booked seat quietly", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [entry()] }));
    expect(
      await rides.confirmSeat("ride-1", "passenger-1", "carer-1", BEFORE),
    ).toBe(true);
    expect(db.rideRosterEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          attendance: "confirmed",
          confirmedAt: BEFORE,
          cancelledAt: null,
        },
      }),
    );
    expect(logTypes()).toEqual(["seatConfirmed"]);
    expect(emitted).toEqual([]);
  });

  it("takes a seat given up back as a new booking, while there is room", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: [entry({ attendance: "cancelled" })] }),
    );
    await rides.confirmSeat("ride-1", "passenger-1", "carer-1", BEFORE);
    expect(eventTypes()).toEqual(["ride.riderBooked"]);

    db.ride.findUnique.mockResolvedValue(
      scheduled({
        model: "pleasure",
        roster: [
          entry({ attendance: "cancelled" }),
          entry({ id: "e2", passenger: { id: "p-2" } }),
          entry({ id: "e3", passenger: { id: "p-3" } }),
        ],
      }),
    );
    expect(
      await codeOf(rides.confirmSeat("ride-1", "passenger-1", "c", BEFORE)),
    ).toBe("pleasureLimit");
  });

  describe("on a round trip", () => {
    const legs = (there: unknown[], back: unknown[], backOverrides = {}) => {
      const rows: Record<string, unknown> = {
        "ride-there": scheduled({
          id: "ride-there",
          model: "functional",
          returnLeg: { id: "ride-back", status: "scheduled" },
          roster: there,
        }),
        "ride-back": scheduled({
          id: "ride-back",
          model: "functional",
          startsAt: new Date("2026-09-08T15:00:00Z"),
          endsAt: new Date("2026-09-08T16:00:00Z"),
          returnLegOf: { id: "ride-there", status: "scheduled" },
          roster: back,
          ...backOverrides,
        }),
      };
      db.ride.findUnique.mockImplementation(({ where }) =>
        Promise.resolve(rows[where.id]),
      );
    };
    const other = (id: string) => entry({ id, passenger: { id: id } });
    const updated = () =>
      db.rideRosterEntry.update.mock.calls.map(([args]) => args.where.id);

    it("confirms the way back with the way there", async () => {
      legs([entry()], [entry({ id: "entry-back" })]);
      await rides.confirmSeat("ride-there", "passenger-1", "c", BEFORE);
      expect(updated()).toEqual(["entry-1", "entry-back"]);
      expect(emitted).toEqual([]);
    });

    it("takes both seats back as one booking", async () => {
      legs(
        [entry({ attendance: "cancelled" })],
        [entry({ id: "entry-back", attendance: "cancelled" })],
      );
      await rides.confirmSeat("ride-there", "passenger-1", "c", BEFORE);
      expect(emitted).toEqual([
        expect.objectContaining({
          type: "ride.riderBooked",
          rideId: "ride-there",
          pair: { role: "lead", otherRideId: "ride-back" },
        }),
        expect.objectContaining({
          type: "ride.riderBooked",
          rideId: "ride-back",
          pair: { role: "follow", otherRideId: "ride-there" },
        }),
      ]);
    });

    // The way back filled up meanwhile: the way there is still taken back.
    it("takes back only the leg that still has room", async () => {
      legs(
        [entry({ attendance: "cancelled" })],
        [
          entry({ id: "entry-back", attendance: "cancelled" }),
          other("p-2"),
          other("p-3"),
        ],
      );
      await rides.confirmSeat("ride-there", "passenger-1", "c", BEFORE);
      expect(updated()).toEqual(["entry-1"]);
      expect(emitted).toEqual([
        expect.objectContaining({ rideId: "ride-there", pair: null }),
      ]);
    });

    // A seat given up on the way back stays given up when the way there is confirmed.
    it("never takes back the other leg while only confirming this one", async () => {
      legs([entry()], [entry({ id: "entry-back", attendance: "cancelled" })]);
      await rides.confirmSeat("ride-there", "passenger-1", "c", BEFORE);
      expect(updated()).toEqual(["entry-1"]);
      expect(emitted).toEqual([]);
    });

    it("leaves a way back that has already started", async () => {
      legs([entry()], [entry({ id: "entry-back" })], {
        startsAt: new Date("2026-09-07T08:00:00Z"),
      });
      await rides.cancelSeat("ride-there", "passenger-1", "c", BEFORE);
      expect(updated()).toEqual(["entry-1"]);
      expect(emitted).toEqual([expect.objectContaining({ pair: null })]);
    });
  });

  it("books a rider who gave the seat up on the same row again", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: [entry({ attendance: "cancelled" })] }),
    );
    expect(await rides.bookRider("ride-1", "passenger-1", ADMIN)).toBe(true);
    expect(db.rideRosterEntry.create).not.toHaveBeenCalled();
    expect(db.rideRosterEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "entry-1" },
        data: expect.objectContaining({ attendance: "booked" }),
      }),
    );
  });

  it("opens the door two hours before the start", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [entry()] }));
    expect(
      await codeOf(
        rides.setCheckedIn("ride-1", "entry-1", true, "p", "pilot", BEFORE),
      ),
    ).toBe("checkInClosed");
    expect(
      await rides.setCheckedIn(
        "ride-1",
        "entry-1",
        true,
        "p",
        "pilot",
        DOOR_OPEN,
      ),
    ).toBe(true);
    expect(db.rideRosterEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { attendance: "checkedIn", checkedInAt: DOOR_OPEN },
      }),
    );
  });

  it("lets an admin record a ride after the pilot's day has passed", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [entry()] }));
    expect(
      await codeOf(
        rides.setCheckedIn("ride-1", "entry-1", true, "p", "pilot", NEXT_WEEK),
      ),
    ).toBe("checkInClosed");
    expect(
      await rides.setCheckedIn(
        "ride-1",
        "entry-1",
        true,
        ADMIN,
        "admin",
        NEXT_WEEK,
      ),
    ).toBe(true);
  });

  it("undoes a check-in back to where the rider stood", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        roster: [entry({ attendance: "checkedIn", confirmedAt: BEFORE })],
      }),
    );
    await rides.setCheckedIn("ride-1", "entry-1", false, "p", "pilot", RIDING);
    expect(db.rideRosterEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { attendance: "confirmed", checkedInAt: null },
      }),
    );
    expect(logTypes()).toEqual(["checkInUndone"]);
  });

  it("never checks in a seat given up", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: [entry({ attendance: "cancelled" })] }),
    );
    expect(
      await codeOf(
        rides.setCheckedIn("ride-1", "entry-1", true, "p", "pilot", RIDING),
      ),
    ).toBe("unknownPassenger");
  });

  it("enrols a walk-up checked in, by name only", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [entry()] }));
    expect(
      await rides.addWalkUp(
        { rideId: "ride-1", firstName: " Inge ", lastName: "Holm" },
        "pilot-1",
        "pilot",
        RIDING,
      ),
    ).toBe("walk-up-1");
    expect(db.rideRosterEntry.create).toHaveBeenCalledWith({
      data: {
        rideId: "ride-1",
        guestName: "Inge Holm",
        position: 1,
        bookedByUserId: "pilot-1",
        checkedInAt: RIDING,
        attendance: "checkedIn",
      },
      select: { id: true },
    });
    expect(emitted).toEqual([]);
  });

  it("seats no walk-up on a ride that is full", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        model: "pleasure",
        roster: [entry(), entry({ id: "e2", passenger: { id: "p-2" } })],
      }),
    );
    expect(
      await codeOf(
        rides.addWalkUp(
          { rideId: "ride-1", firstName: "Inge" },
          "p",
          "pilot",
          RIDING,
        ),
      ),
    ).toBe("pleasureLimit");
  });

  it("removes only a walk-up, never a booked rider", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [entry()] }));
    expect(
      await codeOf(
        rides.removeWalkUp("ride-1", "entry-1", "p", "pilot", RIDING),
      ),
    ).toBe("unknownPassenger");
  });

  it("closes the roster: who came rode, who did not is a no-show", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        roster: [
          entry({ attendance: "checkedIn" }),
          entry({ id: "e2", attendance: "confirmed" }),
          entry({ id: "e3", attendance: "cancelled" }),
        ],
      }),
    );
    expect(
      await rides.closeRoster("ride-1", "pilot-1", "pilot", RIDING),
    ).toEqual({ riders: 1, noShows: 1 });
    expect(
      db.rideRosterEntry.updateMany.mock.calls.map(([args]) => [
        args.where.attendance.in,
        args.data.attendance,
      ]),
    ).toEqual([
      [["checkedIn"], "completed"],
      [["booked", "confirmed"], "noShow"],
    ]);
    expect(db.rideAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        rideId: "ride-1",
        role: "pilot",
        attendance: { in: ["signedUp"] },
      },
      data: { attendance: "completed" },
    });
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: "completed",
          completedAt: RIDING,
          completedByUserId: "pilot-1",
        },
      }),
    );
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "ride.completed",
        riders: 1,
        noShows: 1,
      }),
    ]);
  });

  it("changes nothing on a second tap", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ status: "completed" }));
    expect(await rides.closeRoster("ride-1", "p", "pilot", RIDING)).toBeNull();
    expect(db.ride.update).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("closes no roster before the ride starts, nor a cancelled one", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(
      await codeOf(rides.closeRoster("ride-1", "p", "pilot", DOOR_OPEN)),
    ).toBe("rideNotStarted");
    db.ride.findUnique.mockResolvedValue(scheduled({ status: "cancelled" }));
    expect(
      await codeOf(rides.closeRoster("ride-1", "p", "admin", RIDING)),
    ).toBe("rideClosed");
  });

  it("leaves a pilot a day to close the roster, and an admin longer", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(
      await codeOf(rides.closeRoster("ride-1", "p", "pilot", NEXT_WEEK)),
    ).toBe("rideClosed");
    expect(
      await rides.closeRoster("ride-1", ADMIN, "admin", NEXT_WEEK),
    ).toEqual({ riders: 0, noShows: 0 });
  });

  it("reopens a closed roster where everyone stood on the day", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ status: "completed" }));
    expect(await rides.reopenRide("ride-1", ADMIN)).toBe(true);
    expect(
      db.rideRosterEntry.updateMany.mock.calls.map(([args]) => args),
    ).toEqual([
      {
        where: { rideId: "ride-1", attendance: { in: ["completed"] } },
        data: { attendance: "checkedIn" },
      },
      {
        where: {
          confirmedAt: { not: null },
          rideId: "ride-1",
          attendance: { in: ["noShow"] },
        },
        data: { attendance: "confirmed" },
      },
      {
        where: { rideId: "ride-1", attendance: { in: ["noShow"] } },
        data: { attendance: "booked" },
      },
    ]);
    expect(eventTypes()).toEqual(["ride.reopened"]);
    expect(logTypes()).toEqual(["reopened"]);
  });

  it("reopens only a closed roster", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(await codeOf(rides.reopenRide("ride-1", ADMIN))).toBe(
      "rideNotCompleted",
    );
  });

  it("marks a pilot who never came", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({
        status: "completed",
        assignments: [
          { role: "pilot", attendance: "completed", user: { id: "pilot-1" } },
        ],
      }),
    );
    expect(
      await rides.setPilotNoShow("ride-1", "pilot-1", true, ADMIN, RIDING),
    ).toBe(true);
    expect(db.rideAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        rideId: "ride-1",
        userId: "pilot-1",
        role: "pilot",
        attendance: { in: ["completed"] },
      },
      data: { attendance: "noShow" },
    });
  });
});

describe("the debrief", () => {
  const AFTER = new Date("2026-09-08T11:00:00Z");

  beforeEach(() => {
    db.rideDebrief.upsert.mockImplementation(({ create }) =>
      Promise.resolve({
        ...create,
        id: "debrief-1",
        distanceKm:
          create.distanceKm === null
            ? null
            : new Prisma.Decimal(create.distanceKm),
      }),
    );
  });

  const ride = (overrides: Record<string, unknown> = {}) => {
    db.ride.findUnique.mockImplementation(({ select }) =>
      Promise.resolve(
        select.chapter?.select?.country
          ? { chapter: { country: { code: "DK" } } }
          : scheduled(overrides),
      ),
    );
  };

  it("measures distance only on a functional ride, and counts money in the chapter's currency", async () => {
    ride({ model: "functional" });
    const debrief = await rides.submitDebrief(
      {
        rideId: "ride-1",
        distanceKm: 7.456,
        donationCents: 5000,
        bikeCondition: "good",
        note: "  ",
      },
      "pilot-1",
      "pilot",
      AFTER,
    );
    expect(db.rideDebrief.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { rideId_userId: { rideId: "ride-1", userId: "pilot-1" } },
        update: {
          distanceKm: 7.46,
          donationCents: 5000,
          currency: "DKK",
          bikeCondition: "good",
          cooperation: null,
          note: null,
        },
      }),
    );
    expect(debrief.distanceKm).toBe(7.46);

    jest.clearAllMocks();
    ride({ model: "event" });
    await rides.submitDebrief(
      { rideId: "ride-1", distanceKm: 3 },
      "pilot-1",
      "pilot",
      AFTER,
    );
    expect(db.rideDebrief.upsert.mock.calls[0][0].update).toMatchObject({
      distanceKm: null,
      currency: null,
    });
  });

  it("waits for the ride to start, and never debriefs a cancelled one", async () => {
    ride();
    expect(
      await codeOf(
        rides.submitDebrief(
          { rideId: "ride-1" },
          "p",
          "pilot",
          new Date("2026-09-08T07:00:00Z"),
        ),
      ),
    ).toBe("rideNotStarted");
    ride({ status: "cancelled" });
    expect(
      await codeOf(
        rides.submitDebrief({ rideId: "ride-1" }, "p", "pilot", AFTER),
      ),
    ).toBe("rideClosed");
  });

  // The finish page closes a day after the ride; the debrief closes with it.
  it("takes a pilot's debrief only while the finish page is open", async () => {
    ride();
    const later = new Date("2026-09-15T09:00:00Z");
    expect(
      await codeOf(
        rides.submitDebrief({ rideId: "ride-1" }, "p", "pilot", later),
      ),
    ).toBe("rideClosed");
    await rides.submitDebrief({ rideId: "ride-1" }, ADMIN, "admin", later);
    expect(db.rideDebrief.upsert).toHaveBeenCalledTimes(1);
  });
});

describe("the reminders and the demand check", () => {
  const NOW = new Date("2026-09-07T09:00:00Z");
  const booked = {
    id: "entry-1",
    position: 0,
    attendance: "booked",
    passenger: { id: "passenger-1" },
  };

  it("reminds the riders once, stamped in the same transaction", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [booked] }));
    expect(
      await rides.sendReminder("riderReminderSentAt", "ride-1", 1440, NOW),
    ).toBe(true);
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { riderReminderSentAt: NOW } }),
    );
    expect(emitted).toEqual([
      expect.objectContaining({
        type: "ride.riderReminderDue",
        actorUserId: null,
        pair: null,
      }),
    ]);
    expect((transaction as jest.Mock).mock.calls).toHaveLength(1);
  });

  it("sends nothing twice", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: [booked], riderReminderSentAt: NOW }),
    );
    expect(
      await rides.sendReminder("riderReminderSentAt", "ride-1", 1440, NOW),
    ).toBe(false);
    expect(db.ride.update).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it("reminds nobody about a cancelled ride or one already under way", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: [booked], status: "cancelled" }),
    );
    expect(
      await rides.sendReminder("riderReminderSentAt", "ride-1", 1440, NOW),
    ).toBe(false);
    expect(
      await rides.sendReminder(
        "volunteerReminderSentAt",
        "ride-1",
        1440,
        new Date("2026-09-08T09:00:00Z"),
      ),
    ).toBe(false);
    expect(emitted).toEqual([]);
  });

  it("stamps a ride nobody is left to remind, and says nothing", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ roster: [{ ...booked, attendance: "cancelled" }] }),
    );
    expect(
      await rides.sendReminder("riderReminderSentAt", "ride-1", 1440, NOW),
    ).toBe(false);
    expect(db.ride.update).toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  // Moved to next week after the sweep listed it: it waits for its new time.
  it("leaves a ride that moved out of its lead under the lock", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [booked] }));
    expect(
      await rides.sendReminder("riderReminderSentAt", "ride-1", 120, NOW),
    ).toBe(false);
    expect(await rides.checkDemand("ride-1", 120, NOW)).toBe(false);
    expect(db.ride.update).not.toHaveBeenCalled();
  });

  it("reminds the pilots with their own event", async () => {
    db.ride.findUnique.mockResolvedValue(
      scheduled({ assignments: [{ role: "pilot", user: { id: "p" } }] }),
    );
    await rides.sendReminder("volunteerReminderSentAt", "ride-1", 1440, NOW);
    expect(eventTypes()).toEqual(["ride.volunteerReminderDue"]);
  });

  it("flags an empty roster once, and a booked one never", async () => {
    db.ride.findUnique.mockResolvedValue(scheduled());
    expect(await rides.checkDemand("ride-1", 1440, NOW)).toBe(true);
    expect(db.ride.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { demandCheckedAt: NOW } }),
    );
    expect(eventTypes()).toEqual(["ride.noDemand"]);

    emitted.length = 0;
    db.ride.findUnique.mockResolvedValue(scheduled({ roster: [booked] }));
    expect(await rides.checkDemand("ride-1", 1440, NOW)).toBe(false);
    expect(emitted).toEqual([]);
  });

  it("reads the rides due inside each lead, unstamped and still ahead", async () => {
    await rides.listRidesDue("demandCheckedAt", [CHAPTER], 120, NOW, 10);
    expect(db.ride.findMany.mock.calls[0][0].where).toEqual({
      chapterId: { in: [CHAPTER] },
      status: "scheduled",
      startsAt: { gt: NOW, lte: new Date("2026-09-07T11:00:00Z") },
      demandCheckedAt: null,
      NOT: {
        returnLegOf: {
          is: {
            status: "scheduled",
            startsAt: { gt: NOW },
            demandCheckedAt: null,
          },
        },
      },
    });
  });

  // A way there with nobody to remind must not hold back its way back's reminder.
  it("leaves a way back waiting only for a way there that is due itself", async () => {
    const seated = {
      roster: {
        some: { attendance: { not: "cancelled" }, passengerId: { not: null } },
      },
    };
    await rides.listRidesDue("riderReminderSentAt", [CHAPTER], 1440, NOW, 10);
    expect(db.ride.findMany.mock.calls[0][0].where).toEqual({
      chapterId: { in: [CHAPTER] },
      status: "scheduled",
      startsAt: { gt: NOW, lte: new Date("2026-09-08T09:00:00Z") },
      riderReminderSentAt: null,
      ...seated,
      NOT: {
        returnLegOf: {
          is: {
            status: "scheduled",
            startsAt: { gt: NOW },
            riderReminderSentAt: null,
            ...seated,
          },
        },
      },
    });

    await rides.listChaptersDue("volunteerReminderSentAt", 2880, NOW);
    expect(db.ride.findMany.mock.calls[1][0]).toMatchObject({
      where: {
        assignments: { some: {} },
        NOT: { returnLegOf: { is: { assignments: { some: {} } } } },
      },
      distinct: ["chapterId"],
    });
  });
});

describe("who runs a ride on the day as its pilot", () => {
  // The finish page carries the access code: never for a pilot who never came.
  it("opens the finish page only to a pilot not marked as a no-show", async () => {
    db.ride.findFirst.mockResolvedValue(null);
    const now = new Date("2026-09-08T11:00:00Z");
    await rides.getFinishableRideForPilot("ride-1", "pilot-1", now);
    expect(db.ride.findFirst.mock.calls[0][0].where).toMatchObject({
      id: "ride-1",
      assignments: {
        some: {
          userId: "pilot-1",
          role: "pilot",
          attendance: { not: "noShow" },
        },
      },
    });
  });

  it("asks for an assignment not marked as a no-show, in a chapter still piloted", async () => {
    db.ride.findFirst.mockResolvedValue(null);
    expect(await rides.pilotCanRun("ride-1", "pilot-1")).toBe(false);
    expect(db.ride.findFirst.mock.calls[0][0].where).toEqual({
      id: "ride-1",
      assignments: {
        some: {
          userId: "pilot-1",
          role: "pilot",
          attendance: { not: "noShow" },
        },
      },
      chapter: {
        members: {
          some: { userId: "pilot-1", role: { contains: "pilot" } },
        },
      },
    });
  });
});

describe("the ride day, edge by edge", () => {
  const BEFORE = new Date("2026-09-07T09:00:00Z");
  const RIDING = new Date("2026-09-08T09:00:00Z");
  const seat = (overrides: Record<string, unknown> = {}) => ({
    id: "entry-1",
    position: 0,
    attendance: "booked",
    confirmedAt: null,
    checkedInAt: null,
    guestName: null,
    passenger: { id: "passenger-1", managedByUserId: "carer-1", userId: null },
    ...overrides,
  });
  const walkUp = seat({
    id: "walk-up-1",
    attendance: "checkedIn",
    guestName: "Inge Holm",
    passenger: null,
  });

  beforeEach(() => {
    db.rideRosterEntry.update.mockResolvedValue({ id: "entry-1" });
    db.rideRosterEntry.updateMany.mockResolvedValue({ count: 1 });
    db.rideRosterEntry.delete.mockResolvedValue({ id: "walk-up-1" });
    db.rideRosterEntry.deleteMany.mockResolvedValue({ count: 1 });
    db.rideAssignment.updateMany.mockResolvedValue({ count: 1 });
  });

  describe("check-in", () => {
    it("opens exactly two hours before the start", () => {
      const ride = { status: "scheduled", ...base };
      const at = (ms: number) => new Date(base.startsAt.getTime() + ms);
      expect(rides.checkInOpen(ride, "pilot", at(-120 * 60_000 - 1))).toBe(
        false,
      );
      expect(rides.checkInOpen(ride, "pilot", at(-120 * 60_000))).toBe(true);
    });

    it("closes for a pilot a day after the ride ends, and never for an admin", () => {
      const ride = { status: "scheduled", ...base };
      const after = (ms: number) => new Date(base.endsAt.getTime() + ms);
      const day = 24 * 3_600_000;
      expect(rides.checkInOpen(ride, "pilot", after(day))).toBe(true);
      expect(rides.checkInOpen(ride, "pilot", after(day + 1))).toBe(false);
      expect(rides.canComplete(ride, "pilot", after(day + 1))).toBe(false);
      expect(rides.checkInOpen(ride, "admin", after(30 * day))).toBe(true);
      expect(rides.canComplete(ride, "admin", after(30 * day))).toBe(true);
      expect(
        rides.checkInOpen({ ...ride, status: "completed" }, "admin", RIDING),
      ).toBe(false);
    });

    it("keeps an admin out before the door opens too", async () => {
      db.ride.findUnique.mockResolvedValue(scheduled({ roster: [seat()] }));
      expect(
        await codeOf(
          rides.setCheckedIn("ride-1", "entry-1", true, ADMIN, "admin", BEFORE),
        ),
      ).toBe("checkInClosed");
    });

    it("changes nothing, and logs nothing, when the rider already stands there", async () => {
      db.ride.findUnique.mockResolvedValue(
        scheduled({ roster: [seat({ attendance: "checkedIn" })] }),
      );
      expect(
        await rides.setCheckedIn(
          "ride-1",
          "entry-1",
          true,
          "p",
          "pilot",
          RIDING,
        ),
      ).toBe(false);
      expect(db.rideRosterEntry.update).not.toHaveBeenCalled();
      expect(logTypes()).toEqual([]);
    });

    it("undoes an unconfirmed rider's check-in back to booked", async () => {
      db.ride.findUnique.mockResolvedValue(
        scheduled({ roster: [seat({ attendance: "checkedIn" })] }),
      );
      await rides.setCheckedIn(
        "ride-1",
        "entry-1",
        false,
        "p",
        "pilot",
        RIDING,
      );
      expect(db.rideRosterEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { attendance: "booked", checkedInAt: null },
        }),
      );
    });

    it("removes a walk-up by their row, and logs it", async () => {
      db.ride.findUnique.mockResolvedValue(scheduled({ roster: [walkUp] }));
      expect(
        await rides.removeWalkUp("ride-1", "walk-up-1", "p", "pilot", RIDING),
      ).toBe(true);
      expect(db.rideRosterEntry.delete).toHaveBeenCalledWith({
        where: { id: "walk-up-1" },
        select: { id: true },
      });
      expect(logTypes()).toEqual(["walkUpRemoved"]);
      expect(
        await codeOf(
          rides.removeWalkUp("ride-1", "walk-up-1", "p", "pilot", BEFORE),
        ),
      ).toBe("checkInClosed");
    });

    it("names a walk-up in the history by the name typed at the door", async () => {
      db.rideLogEntry.findMany.mockResolvedValue([
        { id: "1", type: "walkUpAdded", payload: { entryId: "walk-up-1" } },
        { id: "2", type: "checkedIn", payload: { entryId: "entry-1" } },
      ]);
      db.rideRosterEntry.findMany.mockResolvedValue([
        { id: "walk-up-1", guestName: "Inge Holm", passenger: null },
        {
          id: "entry-1",
          guestName: null,
          passenger: { firstName: "Erna", lastName: "Huber" },
        },
      ]);
      const log = await rides.listRideLog("ride-1");
      expect(
        log.map((entry) => (entry.payload as { name: string }).name),
      ).toEqual(["Inge Holm", "Erna Huber"]);
    });
  });

  describe("seats", () => {
    it("tells the admins the roster emptied only when the last seated rider goes", async () => {
      const removed = async (roster: unknown[]) => {
        emitted.length = 0;
        db.ride.findUnique.mockResolvedValue(scheduled({ roster }));
        await rides.cancelBooking("ride-1", "passenger-1", ADMIN);
        return (emitted[0] as unknown as { rosterNowEmpty: boolean })
          .rosterNowEmpty;
      };
      expect(await removed([seat()])).toBe(true);
      expect(
        await removed([seat(), seat({ id: "e2", passenger: { id: "p-2" } })]),
      ).toBe(false);
      expect(
        await removed([
          seat({ attendance: "cancelled" }),
          seat({ id: "e2", passenger: { id: "p-2" } }),
        ]),
      ).toBe(false);
    });

    it("lets a family take back a given-up event seat, counting only seats taken", async () => {
      db.ride.findUnique.mockResolvedValue(
        scheduled({
          announced: true,
          capacity: 2,
          startsAt: new Date("2026-09-08T08:00:00Z"),
          roster: [
            seat({ attendance: "cancelled" }),
            seat({ id: "e2", passenger: { id: "p-2" } }),
          ],
        }),
      );
      expect(
        await rides.bookSeats("ride-1", ["passenger-1"], "carer-1", BEFORE),
      ).toBe(1);
      expect(db.rideRosterEntry.create).not.toHaveBeenCalled();
      expect(db.rideRosterEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "entry-1" },
          data: expect.objectContaining({ attendance: "booked" }),
        }),
      );
    });
  });

  describe("on a round trip, the sweep", () => {
    const legs = (
      there: Record<string, unknown>,
      back: Record<string, unknown>,
    ) => {
      const rows: Record<string, unknown> = {
        "ride-there": scheduled({
          id: "ride-there",
          model: "functional",
          returnLeg: { id: "ride-back", status: "scheduled" },
          ...there,
        }),
        "ride-back": scheduled({
          id: "ride-back",
          model: "functional",
          startsAt: new Date("2026-09-08T15:00:00Z"),
          endsAt: new Date("2026-09-08T16:00:00Z"),
          returnLegOf: { id: "ride-there", status: "scheduled" },
          ...back,
        }),
      };
      db.ride.findUnique.mockImplementation(({ where }) =>
        Promise.resolve(rows[where.id]),
      );
    };
    const stamped = () =>
      db.ride.update.mock.calls.map(([args]) => args.where.id);

    it("reminds both legs as one message", async () => {
      legs({ roster: [seat()] }, { roster: [seat({ id: "b" })] });
      await rides.sendReminder(
        "riderReminderSentAt",
        "ride-there",
        1440,
        BEFORE,
      );
      expect(stamped()).toEqual(["ride-there", "ride-back"]);
      expect(
        emitted.map((event) => (event as unknown as { pair: unknown }).pair),
      ).toEqual([
        { role: "lead", otherRideId: "ride-back" },
        { role: "follow", otherRideId: "ride-there" },
      ]);
    });

    it("leaves a way back already reminded, and speaks for this leg alone", async () => {
      legs(
        { roster: [seat()] },
        { roster: [seat({ id: "b" })], riderReminderSentAt: BEFORE },
      );
      await rides.sendReminder(
        "riderReminderSentAt",
        "ride-there",
        1440,
        BEFORE,
      );
      expect(stamped()).toEqual(["ride-there"]);
      expect(emitted).toEqual([expect.objectContaining({ pair: null })]);
    });

    it("flags only the empty leg, on its own", async () => {
      legs({ roster: [seat()] }, { roster: [] });
      await rides.checkDemand("ride-there", 1440, BEFORE);
      expect(stamped()).toEqual(["ride-there", "ride-back"]);
      expect(emitted).toEqual([
        expect.objectContaining({ rideId: "ride-back", pair: null }),
      ]);
    });
  });

  describe("a closed roster", () => {
    it("is reopened with its pilots signed up again and its ride open", async () => {
      db.ride.findUnique.mockResolvedValue(scheduled({ status: "completed" }));
      await rides.reopenRide("ride-1", ADMIN);
      expect(db.rideAssignment.updateMany).toHaveBeenCalledWith({
        where: {
          rideId: "ride-1",
          role: "pilot",
          attendance: { in: ["completed"] },
        },
        data: { attendance: "signedUp" },
      });
      expect(db.ride.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: "scheduled",
            completedAt: null,
            completedByUserId: null,
          },
        }),
      );
    });

    const crew = (
      attendance: string,
      overrides: Record<string, unknown> = {},
    ) =>
      scheduled({
        assignments: [{ role: "pilot", attendance, user: { id: "pilot-1" } }],
        ...overrides,
      });
    const marked = () =>
      db.rideAssignment.updateMany.mock.calls.map(
        ([args]) => args.data.attendance,
      );

    it("takes a no-show back to what the pilot did on the day", async () => {
      db.ride.findUnique.mockResolvedValue(
        crew("noShow", { status: "completed" }),
      );
      await rides.setPilotNoShow("ride-1", "pilot-1", false, ADMIN, RIDING);
      db.ride.findUnique.mockResolvedValue(crew("noShow"));
      await rides.setPilotNoShow("ride-1", "pilot-1", false, ADMIN, RIDING);
      expect(marked()).toEqual(["completed", "signedUp"]);
    });

    it("refuses a no-show for someone not piloting, before the start, or on a cancelled ride", async () => {
      db.ride.findUnique.mockResolvedValue(crew("signedUp"));
      expect(
        await codeOf(
          rides.setPilotNoShow("ride-1", "pilot-9", true, ADMIN, RIDING),
        ),
      ).toBe("notAssigned");
      expect(
        await codeOf(
          rides.setPilotNoShow("ride-1", "pilot-1", true, ADMIN, BEFORE),
        ),
      ).toBe("rideNotStarted");
      db.ride.findUnique.mockResolvedValue(
        crew("signedUp", { status: "cancelled" }),
      );
      expect(
        await codeOf(
          rides.setPilotNoShow("ride-1", "pilot-1", true, ADMIN, RIDING),
        ),
      ).toBe("rideClosed");
    });

    it("changes nothing for a pilot already marked", async () => {
      db.ride.findUnique.mockResolvedValue(crew("noShow"));
      expect(
        await rides.setPilotNoShow("ride-1", "pilot-1", true, ADMIN, RIDING),
      ).toBe(false);
      expect(db.rideAssignment.updateMany).not.toHaveBeenCalled();
      expect(logTypes()).toEqual([]);
    });

    // closeRoster only turns signedUp into completed, so a marked pilot stays marked.
    it("keeps a pilot marked before closing marked after it", async () => {
      db.ride.findUnique.mockResolvedValue(crew("noShow"));
      await rides.closeRoster("ride-1", ADMIN, "admin", RIDING);
      expect(db.rideAssignment.updateMany).toHaveBeenCalledWith({
        where: {
          rideId: "ride-1",
          role: "pilot",
          attendance: { in: ["signedUp"] },
        },
        data: { attendance: "completed" },
      });
    });
  });

  describe("what a walk-up guest and a given-up seat show", () => {
    it("never reads a guest's name for a rider's account", async () => {
      db.ride.findMany.mockResolvedValue([]);
      db.ride.findFirst.mockResolvedValue(null);
      await rides.getRideForPassengers("ride-1", ["passenger-1"]);
      await rides.listPassengerRides(["passenger-1"]);
      const detail = db.ride.findFirst.mock.calls[0][0].select;
      expect(Object.keys(detail.roster.select)).not.toContain("guestName");
      for (const [args] of db.ride.findMany.mock.calls) {
        expect(args.select.roster).toBeUndefined();
        expect(args.where.roster.some.attendance).toEqual({ not: "cancelled" });
      }
    });

    it("counts seats taken the same way where pilots and families look", async () => {
      db.ride.findMany.mockResolvedValue([]);
      db.member.findMany.mockResolvedValue([]);
      await rides.listOpenRidesForPilot("pilot-1", [CHAPTER], BEFORE);
      await rides.listAnnouncedEvents(
        [{ id: "passenger-1", chapterId: CHAPTER }],
        BEFORE,
      );
      for (const [args] of db.ride.findMany.mock.calls)
        expect(args.select._count).toEqual({
          select: { roster: { where: { attendance: { not: "cancelled" } } } },
        });
    });

    it("tells the ride's chat and notices only about seats still taken", async () => {
      db.ride.findUnique.mockResolvedValue({
        chapterId: CHAPTER,
        assignments: [],
        roster: [
          { passenger: null },
          { passenger: { managedByUserId: "carer-1", userId: null } },
        ],
      });
      expect(await rides.listRideParticipants("ride-1")).toMatchObject({
        riderAccountUserIds: ["carer-1"],
      });
      expect(db.ride.findUnique.mock.calls[0][0].select.roster.where).toEqual({
        attendance: { not: "cancelled" },
        passengerId: { not: null },
      });
    });
  });
});

describe("a rider's account that gave every seat up", () => {
  const ride = (attendance: string) => ({
    id: "ride-1",
    chapterId: CHAPTER,
    assignments: [
      {
        role: "pilot",
        user: { id: "pilot-1", name: "Piet", phoneNumber: "+49 1" },
      },
    ],
    roster: [{ id: "e1", attendance, passenger: { id: "passenger-1" } }],
  });

  beforeEach(() =>
    db.member.findMany.mockResolvedValue([
      { organizationId: CHAPTER, userId: "pilot-1" },
    ]),
  );

  it("still sees who pilots, but not how to reach them", async () => {
    db.ride.findFirst.mockResolvedValue(ride("cancelled"));
    const seen = await rides.getRideForPassengers("ride-1", ["passenger-1"]);
    expect(seen?.assignments[0].user).toMatchObject({
      name: "Piet",
      phoneNumber: null,
    });
  });

  it("keeps the number while a seat is held", async () => {
    db.ride.findFirst.mockResolvedValue(ride("booked"));
    const seen = await rides.getRideForPassengers("ride-1", ["passenger-1"]);
    expect(seen?.assignments[0].user.phoneNumber).toBe("+49 1");
  });
});
