import { prisma } from "@/lib/prisma";
import { notifications } from "@/features/notifications";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    delivery: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    device: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const db = prisma as unknown as {
  notification: {
    upsert: jest.Mock;
    updateMany: jest.Mock;
  };
  delivery: { findUnique: jest.Mock; upsert: jest.Mock };
  device: { upsert: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock };
};

const input = {
  eventId: "event-1",
  recipientUserId: "user-pernille",
  category: "application" as const,
  payload: { chapterName: "München", approved: true, note: null },
  href: "/pilot",
};

beforeEach(() => jest.clearAllMocks());

describe("notifications.create", () => {
  it("upserts on (eventId, recipient), so a retried job adds no second card", async () => {
    await notifications.create(input);

    expect(db.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventId_recipientUserId: {
            eventId: "event-1",
            recipientUserId: "user-pernille",
          },
        },
        update: {},
      }),
    );
  });

  // An absolute URL in the bell is an open redirect.
  it("refuses an href that leaves the app", async () => {
    await expect(
      notifications.create({ ...input, href: "https://evil.example/pilot" }),
    ).rejects.toThrow();
    await expect(
      notifications.create({ ...input, href: "//evil.example" }),
    ).rejects.toThrow();
    await expect(
      notifications.create({ ...input, href: "/\\evil.example" }),
    ).rejects.toThrow();
    expect(db.notification.upsert).not.toHaveBeenCalled();
  });
});

describe("notifications.markRead", () => {
  it("scopes the write to the owner, so a guessed id matches nothing", async () => {
    db.notification.updateMany.mockResolvedValue({ count: 0 });

    const marked = await notifications.markRead("notif-1", "user-pernille");

    expect(db.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "notif-1",
          recipientUserId: "user-pernille",
          readAt: null,
        },
      }),
    );
    expect(marked).toBe(false);
  });
});

describe("notifications.beginDelivery", () => {
  it("claims the attempt when nothing has been sent yet", async () => {
    db.delivery.findUnique.mockResolvedValue(null);
    db.delivery.upsert.mockResolvedValue({ id: "delivery-1" });

    expect(
      await notifications.beginDelivery({
        notificationId: "notif-1",
        channel: "email",
      }),
    ).toEqual({ id: "delivery-1" });
  });

  it("refuses to claim one that already went out", async () => {
    db.delivery.findUnique.mockResolvedValue({ id: "d-1", status: "sent" });

    expect(
      await notifications.beginDelivery({
        notificationId: "notif-1",
        channel: "email",
      }),
    ).toBeNull();
    expect(db.delivery.upsert).not.toHaveBeenCalled();
  });
});

describe("notifications.registerDevice", () => {
  // FCM hands the same token to whoever signs in on that phone next, so the
  // row has to move rather than a second one pushing to the previous owner.
  it("keys the row on the token and re-binds it to the current user", async () => {
    await notifications.registerDevice({
      userId: "user-pernille",
      token: "token-a",
      platform: "ios",
    });

    expect(db.device.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: "token-a" },
        create: {
          userId: "user-pernille",
          token: "token-a",
          platform: "ios",
        },
        update: expect.objectContaining({
          userId: "user-pernille",
          platform: "ios",
        }),
      }),
    );
  });

  it("refuses a token past the column width and a platform we cannot push to", () => {
    expect(() =>
      notifications.registerDevice({
        userId: "user-pernille",
        token: "t".repeat(513),
        platform: "ios",
      }),
    ).toThrow();
    expect(() =>
      notifications.registerDevice({
        userId: "user-pernille",
        token: "token-a",
        platform: "web" as "ios",
      }),
    ).toThrow();
    expect(db.device.upsert).not.toHaveBeenCalled();
  });
});

describe("notifications.unregisterDevice", () => {
  it("scopes the delete to the owner, so a stolen token stays registered", async () => {
    db.device.deleteMany.mockResolvedValue({ count: 0 });

    const removed = await notifications.unregisterDevice(
      "user-pernille",
      "token-a",
    );

    expect(db.device.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-pernille", token: "token-a" },
    });
    expect(removed).toBe(false);
  });
});

describe("notifications.removeDeviceTokens", () => {
  // An empty `in` list matches nothing on MySQL, but the round trip is still
  // paid for on every push that had no dead tokens.
  it("makes no call when the send retired nothing", async () => {
    expect(await notifications.removeDeviceTokens([])).toBe(0);
    expect(db.device.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes by token, whoever they belong to now", async () => {
    db.device.deleteMany.mockResolvedValue({ count: 2 });

    expect(await notifications.removeDeviceTokens(["dead-a", "dead-b"])).toBe(
      2,
    );
    expect(db.device.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["dead-a", "dead-b"] } },
    });
  });
});

describe("notifications.getDelivery", () => {
  it("reads the sibling channel without claiming it", async () => {
    db.delivery.findUnique.mockResolvedValue({ id: "d-1", status: "sent" });

    expect(await notifications.getDelivery("notif-1", "push")).toEqual({
      id: "d-1",
      status: "sent",
    });
    expect(db.delivery.upsert).not.toHaveBeenCalled();
  });
});
