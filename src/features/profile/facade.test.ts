import { prisma } from "@/lib/prisma";
import { profile } from "@/features/profile";

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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
  user: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  event: { create: jest.Mock };
};

const USER = "user-pernille";
const CHAPTER = "chapter-muenchen";

const stamped = (count: number) =>
  db.user.updateMany.mockResolvedValue({ count });

beforeEach(() => {
  jest.clearAllMocks();
  stamped(1);
});

describe("completeOnboarding", () => {
  it("stamps the account and announces the welcome once", async () => {
    await expect(
      profile.completeOnboarding(USER, { chapterId: CHAPTER, role: "pilot" }),
    ).resolves.toBe(true);

    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: USER, onboardedAt: null },
      data: { onboardedAt: expect.any(Date) },
    });
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "user.onboarded",
          chapterId: CHAPTER,
          payload: expect.objectContaining({ userId: USER, role: "pilot" }),
        }),
      }),
    );
  });

  it("stays silent when the account was already onboarded", async () => {
    stamped(0);

    await expect(
      profile.completeOnboarding(USER, { chapterId: CHAPTER, role: "pilot" }),
    ).resolves.toBe(false);
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it("announces a welcome with no chapter behind it", async () => {
    await profile.completeOnboarding(USER, {
      chapterId: null,
      role: "passenger",
    });

    expect(db.event.create.mock.calls[0][0].data).toMatchObject({
      chapterId: null,
      payload: expect.objectContaining({ role: "passenger" }),
    });
  });
});

describe("updateOwnDetails", () => {
  const data = () => db.user.update.mock.calls[0][0].data;

  it("writes only the field that was edited", async () => {
    await profile.updateOwnDetails(USER, { name: "Pernille Holm" });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: USER },
      data: { name: "Pernille Holm" },
    });
  });

  it("trims the name it is given", async () => {
    await profile.updateOwnDetails(USER, { name: "  Pernille Holm  " });

    expect(data()).toEqual({ name: "Pernille Holm" });
  });

  it("keeps the fields that were not sent out of the write", async () => {
    await profile.updateOwnDetails(USER, { gender: "female" });

    expect(data()).toEqual({ gender: "female" });
  });

  it("coerces an ISO date string into a Date", async () => {
    await profile.updateOwnDetails(USER, { birthDate: "1948-04-02" });

    expect(data().birthDate).toEqual(new Date("1948-04-02"));
  });

  it("refuses a patch with nothing in it", async () => {
    await expect(profile.updateOwnDetails(USER, {})).rejects.toThrow();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("refuses a birth date outside the plausible range", async () => {
    await expect(
      profile.updateOwnDetails(USER, { birthDate: "1899-04-02" }),
    ).rejects.toThrow();
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("setNotificationPreferences", () => {
  it("writes both switches when both are sent", async () => {
    await profile.setNotificationPreferences(USER, {
      push: true,
      email: false,
    });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: USER },
      data: { notifyPush: true, notifyEmail: false },
    });
  });

  it("leaves the untouched switch alone", async () => {
    await profile.setNotificationPreferences(USER, { email: true });

    expect(db.user.update.mock.calls[0][0].data).toEqual({ notifyEmail: true });
  });

  it("writes the two message switches on their own columns", async () => {
    await profile.setNotificationPreferences(USER, {
      chatPush: false,
      chatEmail: true,
    });

    expect(db.user.update.mock.calls[0][0].data).toEqual({
      notifyChatPush: false,
      notifyChatEmail: true,
    });
  });

  it("refuses an empty preference patch", async () => {
    await expect(
      profile.setNotificationPreferences(USER, {}),
    ).rejects.toThrow();
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("getProfiles", () => {
  it("asks for each account once", async () => {
    db.user.findMany.mockResolvedValue([]);

    await profile.getProfiles(["user-anna", "user-bo", "user-anna"]);

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["user-anna", "user-bo"] } },
      }),
    );
  });

  it("reads nothing for an empty list", async () => {
    await expect(profile.getProfiles([])).resolves.toEqual([]);
    expect(db.user.findMany).not.toHaveBeenCalled();
  });
});

describe("getUserIdByPhone", () => {
  it("answers with the account behind an E.164 number", async () => {
    db.user.findFirst.mockResolvedValue({ id: USER });

    await expect(profile.getUserIdByPhone("+4915112345678")).resolves.toBe(
      USER,
    );
    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: { phoneNumber: "+4915112345678" },
      select: { id: true },
    });
  });

  it("answers with null when nobody uses it", async () => {
    db.user.findFirst.mockResolvedValue(null);

    await expect(
      profile.getUserIdByPhone("+4915112345678"),
    ).resolves.toBeNull();
  });
});
