import { chat } from "@/features/chat";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { isPushConfigured, sendPush } from "@/lib/push";
import { deliverChatPush } from "@/use-cases/chat-notifications/deliver-chat-push";

jest.mock("@/features/chat", () => ({
  chat: {
    getMessage: jest.fn(),
    getConversation: jest.fn(),
    countUnreadConversations: jest.fn(),
  },
}));
jest.mock("@/features/notifications", () => ({
  notifications: {
    listDeviceTokens: jest.fn(),
    removeDeviceTokens: jest.fn(),
    unseenCount: jest.fn(),
  },
}));
jest.mock("@/features/profile", () => ({ profile: { getProfile: jest.fn() } }));
jest.mock("@/lib/push", () => ({
  isPushConfigured: jest.fn(() => true),
  sendPush: jest.fn(async () => ({ sent: 1, invalidTokens: [] })),
}));

const getMessage = chat.getMessage as jest.Mock;
const getConversation = chat.getConversation as jest.Mock;
const countUnread = chat.countUnreadConversations as jest.Mock;
const listDeviceTokens = notifications.listDeviceTokens as jest.Mock;
const removeDeviceTokens = notifications.removeDeviceTokens as jest.Mock;
const unseenCount = notifications.unseenCount as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const configured = isPushConfigured as jest.Mock;
const push = sendPush as jest.Mock;

const RECIPIENT = "user-bo";
const SENDER = "user-anna";
const CONVERSATION = "conv-1";

const job = {
  recipientUserId: RECIPIENT,
  conversationId: CONVERSATION,
  messageId: "msg-1",
};

const direct = (patch: Record<string, unknown> = {}) => ({
  id: CONVERSATION,
  kind: "direct",
  title: null,
  lastSeq: 4,
  me: { role: "member", lastReadSeq: 0, mutedUntil: null },
  ...patch,
});

beforeEach(() => {
  jest.clearAllMocks();
  getMessage.mockResolvedValue({
    id: "msg-1",
    conversationId: CONVERSATION,
    seq: 4,
    senderId: SENDER,
    kind: "text",
    text: "**Saturday** at ten?",
    deletedAt: null,
  });
  getConversation.mockResolvedValue(direct());
  getProfile.mockImplementation(async (userId: string) =>
    userId === SENDER
      ? { name: "Anna Berg", locale: "en" }
      : { name: "Bo Kruse", locale: "en", notifyChatPush: true },
  );
  listDeviceTokens.mockResolvedValue(["token-a"]);
  unseenCount.mockResolvedValue(2);
  countUnread.mockResolvedValue(3);
  configured.mockReturnValue(true);
  push.mockResolvedValue({ sent: 1, invalidTokens: [] });
});

describe("deliverChatPush", () => {
  it("shows the sender's name and the stripped message", async () => {
    await deliverChatPush(job);

    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["token-a"],
        title: "Anna Berg",
        body: "Saturday at ten?",
      }),
    );
  });

  it("names the group after the sender", async () => {
    getConversation.mockResolvedValue(
      direct({ kind: "group", title: "Saturday crew" }),
    );

    await deliverChatPush(job);

    expect(push.mock.calls[0][0].title).toBe("Anna Berg · Saturday crew");
  });

  it("collapses every banner of one conversation into the last", async () => {
    await deliverChatPush(job);

    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({
        collapseKey: CONVERSATION,
        data: { href: `/chat/${CONVERSATION}`, conversationId: CONVERSATION },
      }),
    );
  });

  it("counts the bell and the unread conversations into one badge", async () => {
    await deliverChatPush(job);

    expect(push.mock.calls[0][0].badge).toBe(5);
  });

  it("falls back to a placeholder name for a deleted account", async () => {
    getProfile.mockImplementation(async (userId: string) =>
      userId === SENDER
        ? null
        : { name: "Bo Kruse", locale: "en", notifyChatPush: true },
    );

    await deliverChatPush(job);

    expect(push.mock.calls[0][0].title).toBe("Someone");
  });

  it("stays silent when the recipient has already read past the message", async () => {
    getConversation.mockResolvedValue(
      direct({ me: { role: "member", lastReadSeq: 4, mutedUntil: null } }),
    );

    await deliverChatPush(job);

    expect(push).not.toHaveBeenCalled();
  });

  it("stays silent for a muted conversation", async () => {
    getConversation.mockResolvedValue(
      direct({
        me: {
          role: "member",
          lastReadSeq: 0,
          mutedUntil: new Date(Date.now() + 60_000).toISOString(),
        },
      }),
    );

    await deliverChatPush(job);

    expect(push).not.toHaveBeenCalled();
  });

  it("stays silent when the recipient switched message push off", async () => {
    getProfile.mockImplementation(async (userId: string) =>
      userId === SENDER
        ? { name: "Anna Berg", locale: "en" }
        : { name: "Bo Kruse", locale: "en", notifyChatPush: false },
    );

    await deliverChatPush(job);

    expect(listDeviceTokens).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("stays silent when the message was deleted meanwhile", async () => {
    getMessage.mockResolvedValue({
      kind: "text",
      seq: 4,
      deletedAt: new Date().toISOString(),
    });

    await deliverChatPush(job);

    expect(push).not.toHaveBeenCalled();
  });

  it("skips the send when Firebase is not configured", async () => {
    configured.mockReturnValue(false);

    await deliverChatPush(job);

    expect(push).not.toHaveBeenCalled();
  });

  it("retires the tokens FCM rejected", async () => {
    push.mockResolvedValue({ sent: 0, invalidTokens: ["token-dead"] });

    await deliverChatPush(job);

    expect(removeDeviceTokens).toHaveBeenCalledWith(["token-dead"]);
  });
});
