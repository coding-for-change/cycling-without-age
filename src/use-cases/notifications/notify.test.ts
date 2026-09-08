import { chapters } from "@/features/chapters";
import { notifications } from "@/features/notifications";
import { queue } from "@/lib/events/queues";
import { notify } from "@/use-cases/notifications/notify";
import type { Envelope } from "@/lib/events/catalog";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn() },
}));
jest.mock("@/features/notifications", () => ({
  notifications: { create: jest.fn() },
}));
jest.mock("@/lib/events/queues", () => {
  const add = jest.fn();
  return {
    QUEUE: { events: "events", handlers: "handlers", deliveries: "deliveries" },
    queue: jest.fn(() => ({ add })),
  };
});

const getChapter = chapters.getChapter as jest.Mock;
const create = notifications.create as jest.Mock;
const add = (queue as jest.Mock)("deliveries").add as jest.Mock;

const envelope: Envelope = {
  id: "event-1",
  event: {
    type: "pilotApplication.decided",
    applicationId: "app-1",
    chapterId: "chapter-muenchen",
    userId: "user-pernille",
    actorUserId: "user-anke",
    approved: true,
    note: null,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  getChapter.mockResolvedValue({ name: "München" });
  create.mockResolvedValue({ id: "notif-1" });
});

describe("notify", () => {
  it("writes one inbox row per recipient, in parameters not sentences", async () => {
    await notify(envelope);

    expect(create).toHaveBeenCalledWith({
      eventId: "event-1",
      recipientUserId: "user-pernille",
      category: "application",
      href: "/pilot",
      payload: { chapterName: "München", approved: true, note: null },
    });
  });

  // The jobId is what makes a redelivered event harmless.
  it("queues one delivery per channel, keyed for deduplication", async () => {
    await notify(envelope);

    expect(add).toHaveBeenCalledWith(
      "email",
      { notificationId: "notif-1" },
      { jobId: "notif-1-email" },
    );
  });

  it("refuses an event nobody defined a kind for", async () => {
    const unknown = {
      id: "event-2",
      event: { ...envelope.event, type: "ride.requested" },
    } as unknown as Envelope;

    await expect(notify(unknown)).rejects.toThrow("no kind for ride.requested");
    expect(create).not.toHaveBeenCalled();
  });
});
