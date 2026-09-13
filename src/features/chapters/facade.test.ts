import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { chapters } from "@/features/chapters";
import { DEFAULT_CHAPTER_SETTINGS } from "@/features/chapters/schemas";

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    country: { findUnique: jest.fn() },
    countryAdmin: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    event: { create: jest.fn(async () => ({ id: "event-1" })) },
    organization: { findUnique: jest.fn() },
    chapterSettings: { findUnique: jest.fn(), upsert: jest.fn() },
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
  organization: { findUnique: jest.Mock };
  chapterSettings: { findUnique: jest.Mock; upsert: jest.Mock };
};

const USER = "user-pernille";
const COUNTRY = "country-de";
const ACTOR = "user-anke";
const CHAPTER = "chapter-muenchen";

const emitted = () => db.event.create.mock.calls[0][0].data;

beforeEach(() => {
  jest.clearAllMocks();
  db.country.findUnique.mockResolvedValue({ id: COUNTRY, name: "Deutschland" });
  db.countryAdmin.findUnique.mockResolvedValue(null);
  db.countryAdmin.deleteMany.mockResolvedValue({ count: 1 });
  db.organization.findUnique.mockResolvedValue({ countryId: COUNTRY });
  db.chapterSettings.findUnique.mockResolvedValue(null);
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

describe("reading a chapter's settings", () => {
  // Callers never branch on a missing row: a chapter that changed nothing
  // reads exactly like one whose row says the defaults.
  it("answers with the defaults while there is no row", async () => {
    await expect(chapters.getSettings(CHAPTER)).resolves.toEqual(
      DEFAULT_CHAPTER_SETTINGS,
    );
  });

  it("answers with the row once the chapter has one", async () => {
    const row = { ...DEFAULT_CHAPTER_SETTINGS, notifyOnMemberJoined: false };
    db.chapterSettings.findUnique.mockResolvedValue(row);

    await expect(chapters.getSettings(CHAPTER)).resolves.toEqual(row);
  });
});

describe("writing a chapter's settings", () => {
  it("refuses a chapter that does not exist", async () => {
    db.organization.findUnique.mockResolvedValue(null);

    await expect(
      chapters.updateSettings(CHAPTER, { notifyOnMemberJoined: false }),
    ).rejects.toMatchObject({ name: "DomainError", code: "unknownChapter" });
    expect(db.chapterSettings.upsert).not.toHaveBeenCalled();
  });

  it("stores the reply-to trimmed and lower-cased", async () => {
    await chapters.updateSettings(CHAPTER, {
      replyToEmail: "  Hej@Muenchen.Example  ",
    });

    expect(db.chapterSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { chapterId: CHAPTER },
        update: { replyToEmail: "hej@muenchen.example" },
      }),
    );
  });

  // An emptied note is a value, not an omission: null has to reach the column.
  it("passes an emptied welcome note through to the row", async () => {
    await chapters.updateSettings(CHAPTER, { welcomeNote: null });

    expect(db.chapterSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { chapterId: CHAPTER, welcomeNote: null },
        update: { welcomeNote: null },
      }),
    );
  });

  it("refuses an address that is not one", async () => {
    await expect(
      chapters.updateSettings(CHAPTER, { replyToEmail: "hej@" }),
    ).rejects.toThrow(ZodError);
    expect(db.chapterSettings.upsert).not.toHaveBeenCalled();
  });
});
