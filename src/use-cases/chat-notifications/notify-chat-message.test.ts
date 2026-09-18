import { Job } from "bullmq";
import { chat } from "@/features/chat";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { QUEUE, queue } from "@/lib/events/queues";
import { presence } from "@/lib/realtime";
import type { Envelope } from "@/lib/events/catalog";
import {
  DIGEST_DEBOUNCE_MS,
  DIGEST_MAX_WAIT_MS,
} from "@/use-cases/chat-notifications/digest-window";
import { notifyChatMessage } from "@/use-cases/chat-notifications/notify-chat-message";

jest.mock("bullmq", () => ({ Job: { fromId: jest.fn() } }));
jest.mock("@/features/chat", () => ({
  chat: {
    getMessage: jest.fn(),
    listMembers: jest.fn(),
    getConversation: jest.fn(),
  },
}));
jest.mock("@/features/notifications", () => ({
  notifications: { listDeviceTokens: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfiles: jest.fn() },
}));
jest.mock("@/lib/realtime", () => ({
  presence: { isFocusedOn: jest.fn() },
}));
jest.mock("@/lib/events/queues", () => {
  const queues = new Map<string, unknown>();
  return {
    QUEUE: {
      events: "events",
      handlers: "handlers",
      email: "email",
      push: "push",
    },
    queue: jest.fn((name: string) => {
      const cached = queues.get(name);
      if (cached) return cached;
      const created = {
        add: jest.fn(async () => ({})),
        getDeduplicationJobId: jest.fn(async () => null),
      };
      queues.set(name, created);
      return created;
    }),
  };
});

const getMessage = chat.getMessage as jest.Mock;
const listMembers = chat.listMembers as jest.Mock;
const getConversation = chat.getConversation as jest.Mock;
const listDeviceTokens = notifications.listDeviceTokens as jest.Mock;
const getProfiles = profile.getProfiles as jest.Mock;
const isFocusedOn = presence.isFocusedOn as jest.Mock;
const fromId = Job.fromId as unknown as jest.Mock;

const emails = () =>
  (queue as jest.Mock)(QUEUE.email) as {
    add: jest.Mock;
    getDeduplicationJobId: jest.Mock;
  };
const pushes = () => (queue as jest.Mock)(QUEUE.push) as { add: jest.Mock };

const NOW = Date.parse("2026-09-17T12:00:00.000Z");
const SENDER = "user-anna";
const RECIPIENT = "user-bo";
const CONVERSATION = "conv-1";
const MESSAGE = "msg-1";

const envelope: Envelope<"chat.messageSent"> = {
  id: "event-1",
  event: {
    type: "chat.messageSent",
    conversationId: CONVERSATION,
    messageId: MESSAGE,
    seq: 4,
    actorUserId: SENDER,
    chapterId: "chapter-muenchen",
  },
};

const recipient = (patch: Record<string, unknown> = {}) => ({
  id: RECIPIENT,
  name: "Bo Kruse",
  email: "bo@example.com",
  image: null,
  locale: "da",
  notifyChatPush: true,
  notifyChatEmail: true,
  ...patch,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(NOW);

  getMessage.mockResolvedValue({
    id: MESSAGE,
    conversationId: CONVERSATION,
    seq: 4,
    senderId: SENDER,
    kind: "text",
    text: "Saturday at ten?",
    deletedAt: null,
  });
  listMembers.mockResolvedValue([{ userId: SENDER }, { userId: RECIPIENT }]);
  getProfiles.mockResolvedValue([recipient()]);
  isFocusedOn.mockResolvedValue(false);
  getConversation.mockResolvedValue({
    id: CONVERSATION,
    me: { role: "member", lastReadSeq: 0, mutedUntil: null },
  });
  listDeviceTokens.mockResolvedValue(["token-a"]);
  emails().getDeduplicationJobId.mockResolvedValue(null);
});

afterEach(() => jest.useRealTimers());

describe("notifyChatMessage", () => {
  it("leaves the sender out of the recipients", async () => {
    await notifyChatMessage(envelope);

    expect(getProfiles).toHaveBeenCalledWith([RECIPIENT]);
    expect(pushes().add).toHaveBeenCalledTimes(1);
  });

  it("queues one push job per recipient with a device", async () => {
    await notifyChatMessage(envelope);

    expect(pushes().add).toHaveBeenCalledWith(
      "chat",
      {
        recipientUserId: RECIPIENT,
        conversationId: CONVERSATION,
        messageId: MESSAGE,
      },
      { jobId: `chat-${MESSAGE}-${RECIPIENT}` },
    );
    expect(emails().add).not.toHaveBeenCalled();
  });

  it("stays silent for someone who muted the conversation", async () => {
    getConversation.mockResolvedValue({
      me: {
        role: "member",
        lastReadSeq: 0,
        mutedUntil: new Date(NOW + 60_000).toISOString(),
      },
    });

    await notifyChatMessage(envelope);

    expect(pushes().add).not.toHaveBeenCalled();
    expect(emails().add).not.toHaveBeenCalled();
  });

  it("stays silent for someone who has the conversation open", async () => {
    isFocusedOn.mockResolvedValue(true);

    await notifyChatMessage(envelope);

    expect(isFocusedOn).toHaveBeenCalledWith(RECIPIENT, CONVERSATION);
    expect(pushes().add).not.toHaveBeenCalled();
    expect(emails().add).not.toHaveBeenCalled();
  });

  it("stays silent for someone who left the conversation meanwhile", async () => {
    getConversation.mockResolvedValue(null);

    await notifyChatMessage(envelope);

    expect(pushes().add).not.toHaveBeenCalled();
  });

  it("falls back to a digest when there is no device to reach", async () => {
    listDeviceTokens.mockResolvedValue([]);

    await notifyChatMessage(envelope);

    expect(pushes().add).not.toHaveBeenCalled();
    expect(emails().add).toHaveBeenCalledWith(
      "chat-digest",
      {
        recipientUserId: RECIPIENT,
        conversationId: CONVERSATION,
        windowStartedAt: new Date(NOW).toISOString(),
      },
      {
        delay: DIGEST_DEBOUNCE_MS,
        deduplication: {
          id: `chat-digest-${RECIPIENT}-${CONVERSATION}`,
          extend: true,
          replace: true,
        },
      },
    );
  });

  it("does not look for a device when push is switched off", async () => {
    getProfiles.mockResolvedValue([recipient({ notifyChatPush: false })]);

    await notifyChatMessage(envelope);

    expect(listDeviceTokens).not.toHaveBeenCalled();
    expect(emails().add).toHaveBeenCalled();
  });

  it("keeps the first window so the fifteen minute cap holds", async () => {
    listDeviceTokens.mockResolvedValue([]);
    const startedAt = new Date(NOW - DIGEST_MAX_WAIT_MS + 60_000);
    emails().getDeduplicationJobId.mockResolvedValue("job-9");
    fromId.mockResolvedValue({
      data: { windowStartedAt: startedAt.toISOString() },
    });

    await notifyChatMessage(envelope);

    expect(emails().add).toHaveBeenCalledWith(
      "chat-digest",
      expect.objectContaining({
        windowStartedAt: startedAt.toISOString(),
      }),
      expect.objectContaining({ delay: 60_000 }),
    );
  });

  it("queues nothing for someone who switched both channels off", async () => {
    getProfiles.mockResolvedValue([
      recipient({ notifyChatPush: false, notifyChatEmail: false }),
    ]);

    await notifyChatMessage(envelope);

    expect(getConversation).not.toHaveBeenCalled();
    expect(pushes().add).not.toHaveBeenCalled();
    expect(emails().add).not.toHaveBeenCalled();
  });

  it("ignores a message that was deleted before the job ran", async () => {
    getMessage.mockResolvedValue({
      kind: "text",
      seq: 4,
      deletedAt: new Date(NOW).toISOString(),
    });

    await notifyChatMessage(envelope);

    expect(listMembers).not.toHaveBeenCalled();
  });

  it("never announces a system line", async () => {
    getMessage.mockResolvedValue({ kind: "system", seq: 4, deletedAt: null });

    await notifyChatMessage(envelope);

    expect(listMembers).not.toHaveBeenCalled();
  });
});
