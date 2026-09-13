import { chapters } from "@/features/chapters";
import { membership } from "@/features/membership";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { queue } from "@/lib/events/queues";
import { kindOf } from "@/use-cases/notifications/kinds";
import { notify } from "@/use-cases/notifications/notify";
import type { Envelope } from "@/lib/events/catalog";

jest.mock("@/features/chapters", () => ({
  chapters: { getChapter: jest.fn(), getCountry: jest.fn() },
}));
jest.mock("@/features/membership", () => ({
  membership: { listChapterAdmins: jest.fn() },
}));
jest.mock("@/features/notifications", () => ({
  notifications: { create: jest.fn() },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/lib/events/queues", () => {
  const adds = new Map<string, jest.Mock>();
  return {
    QUEUE: {
      events: "events",
      handlers: "handlers",
      email: "email",
      push: "push",
    },
    queue: jest.fn((name: string) => {
      const cached = adds.get(name);
      if (cached) return { add: cached };
      const add = jest.fn(async () => ({}));
      adds.set(name, add);
      return { add };
    }),
  };
});
jest.mock("@/use-cases/notifications/kinds", () => {
  const actual = jest.requireActual("@/use-cases/notifications/kinds");
  return { ...actual, kindOf: jest.fn(actual.kindOf) };
});

const getChapter = chapters.getChapter as jest.Mock;
const listChapterAdmins = membership.listChapterAdmins as jest.Mock;
const create = notifications.create as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const kindOfMock = kindOf as jest.Mock;
const addTo = (name: string) =>
  (queue as jest.Mock)(name).add as jest.Mock<Promise<unknown>>;

const decided: Envelope = {
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

const submitted: Envelope = {
  id: "event-2",
  event: {
    type: "pilotApplication.submitted",
    applicationId: "app-1",
    chapterId: "chapter-muenchen",
    userId: "user-pernille",
    actorUserId: "user-pernille",
  },
};

const joined: Envelope = {
  id: "event-3",
  event: {
    type: "chapter.memberJoined",
    chapterId: "chapter-muenchen",
    userId: "user-pernille",
    actorUserId: "user-bo",
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  getChapter.mockResolvedValue({ name: "München" });
  getProfile.mockResolvedValue({ name: "Pernille Holm" });
  listChapterAdmins.mockResolvedValue([{ userId: "user-anke" }]);
  create.mockResolvedValue({ id: "notif-1" });
});

describe("notify", () => {
  it("writes one inbox row per recipient, in parameters not sentences", async () => {
    await notify(decided);

    expect(create).toHaveBeenCalledWith({
      eventId: "event-1",
      recipientUserId: "user-pernille",
      category: "application",
      href: "/pilot",
      payload: { chapterName: "München", approved: true, note: null },
    });
  });

  it("writes a row for every chapter admin an event concerns", async () => {
    listChapterAdmins.mockResolvedValue([
      { userId: "user-anke" },
      { userId: "user-bo" },
    ]);

    await notify(submitted);

    expect(create.mock.calls.map(([input]) => input.recipientUserId)).toEqual([
      "user-anke",
      "user-bo",
    ]);
  });

  // The jobId is what makes a redelivered event harmless.
  it("queues one delivery per channel, keyed for deduplication", async () => {
    await notify(decided);

    expect(queue).toHaveBeenCalledWith("push");
    expect(queue).toHaveBeenCalledWith("email");
    expect(addTo("push")).toHaveBeenCalledWith(
      "push",
      { notificationId: "notif-1" },
      { jobId: "notif-1-push" },
    );
    expect(addTo("email")).toHaveBeenCalledWith(
      "email",
      { notificationId: "notif-1" },
      { jobId: "notif-1-email" },
    );
  });

  // The mail is the fallback for a push that never landed, so it waits long
  // enough for the phone to win.
  it("parks the mail of an ifNoPush kind behind the push", async () => {
    await notify(submitted);

    expect(addTo("push")).toHaveBeenCalledWith(
      "push",
      { notificationId: "notif-1" },
      { jobId: "notif-1-push" },
    );
    expect(addTo("email")).toHaveBeenCalledWith(
      "email",
      { notificationId: "notif-1" },
      { jobId: "notif-1-email", delay: 120_000 },
    );
  });

  it("queues nothing at all for an inbox-only kind", async () => {
    await notify(joined);

    expect(create).toHaveBeenCalledTimes(1);
    expect(addTo("push")).not.toHaveBeenCalled();
    expect(addTo("email")).not.toHaveBeenCalled();
  });

  // Otherwise the admin who added the passenger is told about their own click.
  it("leaves the actor out of the recipients", async () => {
    listChapterAdmins.mockResolvedValue([
      { userId: "user-anke" },
      { userId: "user-bo" },
    ]);

    await notify(joined);

    expect(create.mock.calls.map(([input]) => input.recipientUserId)).toEqual([
      "user-anke",
    ]);
  });

  it("passes a kind's collapse key on to the inbox row", async () => {
    kindOfMock.mockReturnValueOnce({
      ...jest
        .requireActual("@/use-cases/notifications/kinds")
        .kindOf("pilotApplication.decided"),
      collapseKey: () => "application:app-1",
    });

    await notify(decided);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ collapseKey: "application:app-1" }),
    );
  });

  it("refuses an event nobody defined a kind for", async () => {
    const unknown = {
      id: "event-9",
      event: { ...decided.event, type: "ride.requested" },
    } as unknown as Envelope;

    await expect(notify(unknown)).rejects.toThrow("no kind for ride.requested");
    expect(create).not.toHaveBeenCalled();
  });
});
