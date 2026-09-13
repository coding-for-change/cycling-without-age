import { prisma } from "@/lib/prisma";
import { chapters } from "@/features/chapters";

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    country: { findUnique: jest.fn() },
    countryAdmin: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    event: { create: jest.fn(async () => ({ id: "event-1" })) },
  };
  client.$transaction = jest.fn((run: (tx: unknown) => unknown) => run(client));
  return { prisma: client };
});
jest.mock("@/lib/events/queues", () => ({
  QUEUE: {
    events: "events",
    handlers: "handlers",
    email: "email",
    push: "push",
  },
  queue: () => ({ add: jest.fn(async () => ({})) }),
}));

const db = prisma as unknown as {
  country: { findUnique: jest.Mock };
  countryAdmin: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    deleteMany: jest.Mock;
  };
  event: { create: jest.Mock };
};

const USER = "user-pernille";
const COUNTRY = "country-de";
const ACTOR = "user-anke";

const emitted = () => db.event.create.mock.calls[0][0].data;

beforeEach(() => {
  jest.clearAllMocks();
  db.country.findUnique.mockResolvedValue({ id: COUNTRY, name: "Deutschland" });
  db.countryAdmin.findUnique.mockResolvedValue(null);
  db.countryAdmin.deleteMany.mockResolvedValue({ count: 1 });
});

describe("appointing a country admin", () => {
  it("writes the row and announces it in one transaction", async () => {
    await expect(
      chapters.appointCountryAdmin(USER, COUNTRY, ACTOR),
    ).resolves.toBe(true);

    expect(db.countryAdmin.upsert).toHaveBeenCalled();
    expect(emitted()).toMatchObject({
      type: "countryAdmin.appointed",
      actorUserId: ACTOR,
      // A country admin belongs to no single chapter.
      chapterId: null,
      payload: expect.objectContaining({ userId: USER, countryId: COUNTRY }),
    });
  });

  // Appointing someone who already runs the country asks for a state that is
  // already true, so nobody is told about it a second time.
  it("stays silent when they already run the country", async () => {
    db.countryAdmin.findUnique.mockResolvedValue({ userId: USER });

    await expect(
      chapters.appointCountryAdmin(USER, COUNTRY, ACTOR),
    ).resolves.toBe(false);
    expect(db.countryAdmin.upsert).not.toHaveBeenCalled();
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it("refuses a country that does not exist", async () => {
    db.country.findUnique.mockResolvedValue(null);

    await expect(
      chapters.appointCountryAdmin(USER, COUNTRY, ACTOR),
    ).rejects.toThrow("unknownCountry");
    expect(db.event.create).not.toHaveBeenCalled();
  });
});

describe("removing a country admin", () => {
  it("deletes the row and announces it in one transaction", async () => {
    await expect(
      chapters.removeCountryAdmin(USER, COUNTRY, ACTOR),
    ).resolves.toBe(true);

    expect(emitted()).toMatchObject({
      type: "countryAdmin.removed",
      actorUserId: ACTOR,
      chapterId: null,
      payload: expect.objectContaining({ userId: USER, countryId: COUNTRY }),
    });
  });

  it("stays silent when there was nothing to remove", async () => {
    db.countryAdmin.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      chapters.removeCountryAdmin(USER, COUNTRY, ACTOR),
    ).resolves.toBe(false);
    expect(db.event.create).not.toHaveBeenCalled();
  });
});
