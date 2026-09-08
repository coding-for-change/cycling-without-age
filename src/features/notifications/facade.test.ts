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
  },
}));

const db = prisma as unknown as {
  notification: {
    upsert: jest.Mock;
    updateMany: jest.Mock;
  };
  delivery: { findUnique: jest.Mock; upsert: jest.Mock };
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
