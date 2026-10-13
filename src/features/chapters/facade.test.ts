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
    chapterOperatingWindow: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    chapterClosure: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  client.$transaction = jest.fn((run: unknown) =>
    typeof run === "function" ? run(client) : Promise.all(run as unknown[]),
  );
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
  chapterOperatingWindow: {
    findMany: jest.Mock;
    deleteMany: jest.Mock;
    createMany: jest.Mock;
  };
  chapterClosure: {
    findMany: jest.Mock;
    upsert: jest.Mock;
    deleteMany: jest.Mock;
  };
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
      chapterId: null,
      payload: expect.objectContaining({ userId: USER, countryId: COUNTRY }),
    });
  });

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

describe("riding hours", () => {
  const window = (weekday: number, from: number, to: number) => ({
    weekday,
    startMinute: from * 60,
    endMinute: to * 60,
  });

  beforeEach(() => {
    db.chapterOperatingWindow.findMany.mockResolvedValue([]);
    db.chapterClosure.findMany.mockResolvedValue([]);
  });

  it("replaces the chapter's windows in one transaction", async () => {
    await chapters.setOperatingWindows(CHAPTER, [
      window(1, 9, 12),
      window(1, 14, 17),
    ]);
    expect(db.chapterOperatingWindow.deleteMany).toHaveBeenCalledWith({
      where: { chapterId: CHAPTER },
    });
    expect(db.chapterOperatingWindow.createMany).toHaveBeenCalledWith({
      data: [
        { chapterId: CHAPTER, ...window(1, 9, 12) },
        { chapterId: CHAPTER, ...window(1, 14, 17) },
      ],
    });
  });

  it.each([
    ["overlapping windows on one day", [window(2, 9, 12), window(2, 11, 14)]],
    [
      "a window shorter than 30 minutes",
      [{ weekday: 3, startMinute: 600, endMinute: 615 }],
    ],
    ["a window that ends before it starts", [window(4, 12, 9)]],
    ["a weekday outside 1–7", [window(0, 9, 12)]],
    ["a weekday outside 1–7", [window(8, 9, 12)]],
    [
      "a start off the 15-minute grid",
      [{ weekday: 1, startMinute: 545, endMinute: 720 }],
    ],
  ])("refuses %s", async (_label, windows) => {
    await expect(
      chapters.setOperatingWindows(CHAPTER, windows),
    ).rejects.toBeInstanceOf(ZodError);
    expect(db.chapterOperatingWindow.createMany).not.toHaveBeenCalled();
  });

  it("allows back-to-back windows on one day", async () => {
    await chapters.setOperatingWindows(CHAPTER, [
      window(5, 9, 12),
      window(5, 12, 15),
    ]);
    expect(db.chapterOperatingWindow.createMany).toHaveBeenCalled();
  });

  it("refuses an unknown chapter", async () => {
    db.organization.findUnique.mockResolvedValue(null);
    await expect(
      chapters.setOperatingWindows(CHAPTER, [window(1, 9, 12)]),
    ).rejects.toMatchObject({ code: "unknownChapter" });
  });

  it("stores a closure as a calendar date", async () => {
    db.chapterClosure.upsert.mockResolvedValue({
      id: "closure-1",
      date: new Date("2026-12-24T00:00:00Z"),
      reason: "Christmas Eve",
    });
    const closure = await chapters.addClosure(CHAPTER, {
      date: "2026-12-24",
      reason: " Christmas Eve ",
    });
    expect(db.chapterClosure.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          chapterId: CHAPTER,
          date: new Date("2026-12-24T00:00:00.000Z"),
          reason: "Christmas Eve",
        },
      }),
    );
    expect(closure.date).toBe("2026-12-24");
  });

  it("refuses an impossible date", async () => {
    await expect(
      chapters.addClosure(CHAPTER, { date: "2026-02-30" }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("only removes a closure of the chapter it names", async () => {
    db.chapterClosure.deleteMany.mockResolvedValue({ count: 0 });
    await expect(
      chapters.removeClosure(CHAPTER, "closure-of-another-chapter"),
    ).rejects.toMatchObject({ code: "notFound" });
    expect(db.chapterClosure.deleteMany).toHaveBeenCalledWith({
      where: { id: "closure-of-another-chapter", chapterId: CHAPTER },
    });
  });

  it("groups windows and closures per chapter", async () => {
    db.chapterOperatingWindow.findMany.mockResolvedValue([
      { chapterId: CHAPTER, ...window(1, 9, 12) },
      { chapterId: "other", ...window(2, 9, 12) },
    ]);
    db.chapterClosure.findMany.mockResolvedValue([
      {
        chapterId: CHAPTER,
        id: "c1",
        date: new Date("2026-12-24T00:00:00Z"),
        reason: null,
      },
    ]);
    expect(await chapters.getOperatingHours(CHAPTER)).toEqual({
      windows: [window(1, 9, 12)],
      closures: ["2026-12-24"],
    });
  });

  it("never caps closures, so one chapter's dates cannot hide another's", async () => {
    db.chapterOperatingWindow.findMany.mockResolvedValue([]);
    db.chapterClosure.findMany.mockResolvedValue([]);
    await chapters.getOperatingHoursOf([CHAPTER, "other"]);
    await chapters.listClosures(CHAPTER);
    for (const [query] of db.chapterClosure.findMany.mock.calls)
      expect(query).not.toHaveProperty("take");
  });
});
