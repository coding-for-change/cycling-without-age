import { chat } from "@/features/chat";
import { notifications } from "@/features/notifications";
import { profile } from "@/features/profile";
import { MailRateLimitedError, sendMail } from "@/lib/mailer";
import { deliverChatDigest } from "@/use-cases/chat-notifications/deliver-chat-digest";
import type { ChatDigestMessage } from "@/emails/chat-digest";

jest.mock("@/features/chat", () => ({
  chat: { getConversation: jest.fn(), listMessages: jest.fn() },
}));
jest.mock("@/features/notifications", () => ({
  notifications: { listDeviceTokens: jest.fn() },
}));
jest.mock("@/features/profile", () => ({
  profile: { getProfile: jest.fn(), getProfiles: jest.fn() },
}));
jest.mock("@/lib/mailer", () => {
  const actual = jest.requireActual("@/lib/mailer");
  return { ...actual, sendMail: jest.fn() };
});

const getConversation = chat.getConversation as jest.Mock;
const listMessages = chat.listMessages as jest.Mock;
const listDeviceTokens = notifications.listDeviceTokens as jest.Mock;
const getProfile = profile.getProfile as jest.Mock;
const getProfiles = profile.getProfiles as jest.Mock;
const mail = sendMail as jest.Mock;

const RECIPIENT = "user-bo";
const ANNA = "user-anna";
const CONVERSATION = "conv-1";

const job = {
  recipientUserId: RECIPIENT,
  conversationId: CONVERSATION,
  windowStartedAt: "2026-09-17T11:55:00.000Z",
};

const conversation = (patch: Record<string, unknown> = {}) => ({
  id: CONVERSATION,
  kind: "direct",
  title: null,
  otherUserId: ANNA,
  lastSeq: 3,
  me: { role: "member", lastReadSeq: 0, mutedUntil: null },
  ...patch,
});

const message = (seq: number, senderId: string | null, text: string) => ({
  id: `msg-${seq}`,
  conversationId: CONVERSATION,
  seq,
  senderId,
  kind: "text",
  text,
  deletedAt: null,
  createdAt: `2026-09-17T09:${String(seq).padStart(2, "0")}:00.000Z`,
});

const rendered = () =>
  mail.mock.calls[0][0].react.props.message as ChatDigestMessage;

beforeEach(() => {
  jest.clearAllMocks();
  getConversation.mockResolvedValue(conversation());
  getProfile.mockResolvedValue({
    name: "Bo Kruse",
    email: "bo@example.com",
    locale: "en",
    notifyChatPush: true,
    notifyChatEmail: true,
  });
  listDeviceTokens.mockResolvedValue([]);
  listMessages.mockResolvedValue([
    message(1, ANNA, "**Saturday** at ten?"),
    message(2, ANNA, "I bring the blanket"),
    message(3, "user-cara", "Me too"),
  ]);
  getProfiles.mockResolvedValue([
    { id: ANNA, name: "Anna Berg", email: "anna@example.com" },
    { id: "user-cara", name: "Cara Lund", email: "cara@example.com" },
  ]);
});

describe("deliverChatDigest", () => {
  it("sends one mail with the unread messages grouped by sender", async () => {
    await expect(deliverChatDigest(job)).resolves.toBe("sent");

    expect(listMessages).toHaveBeenCalledWith(CONVERSATION, RECIPIENT, {
      afterSeq: 0,
      take: 50,
    });
    expect(rendered().groups).toEqual([
      {
        sender: "Anna Berg",
        lines: [
          { text: "Saturday at ten?", time: expect.any(String) },
          { text: "I bring the blanket", time: expect.any(String) },
        ],
      },
      {
        sender: "Cara Lund",
        lines: [{ text: "Me too", time: expect.any(String) }],
      },
    ]);
  });

  it("names a direct conversation after the other person", async () => {
    await deliverChatDigest(job);

    expect(mail.mock.calls[0][0].subject).toBe("Anna Berg wrote to you");
  });

  it("names a group after its title and counts what is unread", async () => {
    getConversation.mockResolvedValue(
      conversation({
        kind: "group",
        title: "Saturday crew",
        otherUserId: null,
      }),
    );

    await deliverChatDigest(job);

    expect(mail.mock.calls[0][0].subject).toBe(
      "3 new messages in Saturday crew",
    );
  });

  it("links to the conversation and repeats it in the plain text part", async () => {
    await deliverChatDigest(job);

    const sent = mail.mock.calls[0][0];
    expect(sent.react.props.href).toMatch(new RegExp(`/chat/${CONVERSATION}$`));
    expect(sent.text).toContain("Saturday at ten?");
  });

  it("says how many messages did not fit", async () => {
    getConversation.mockResolvedValue(conversation({ lastSeq: 60 }));
    listMessages.mockResolvedValue(
      Array.from({ length: 50 }, (_, index) =>
        message(index + 1, ANNA, `line ${index}`),
      ),
    );

    await deliverChatDigest(job);

    expect(rendered().more).toBe("and 10 more");
  });

  it("stays silent when the recipient read the conversation meanwhile", async () => {
    getConversation.mockResolvedValue(
      conversation({
        me: { role: "member", lastReadSeq: 3, mutedUntil: null },
      }),
    );

    await expect(deliverChatDigest(job)).resolves.toBe("already read");

    expect(mail).not.toHaveBeenCalled();
  });

  it("stays silent when the recipient left the conversation", async () => {
    getConversation.mockResolvedValue(null);

    await expect(deliverChatDigest(job)).resolves.toBe("left conversation");

    expect(mail).not.toHaveBeenCalled();
  });

  it("stays silent for a muted conversation", async () => {
    getConversation.mockResolvedValue(
      conversation({
        me: {
          role: "member",
          lastReadSeq: 0,
          mutedUntil: new Date(Date.now() + 60_000).toISOString(),
        },
      }),
    );

    await expect(deliverChatDigest(job)).resolves.toBe("muted");

    expect(mail).not.toHaveBeenCalled();
  });

  it("stays silent when the recipient switched message mail off", async () => {
    getProfile.mockResolvedValue({
      email: "bo@example.com",
      locale: "en",
      notifyChatPush: true,
      notifyChatEmail: false,
    });

    await expect(deliverChatDigest(job)).resolves.toBe(
      "email disabled for chat",
    );

    expect(mail).not.toHaveBeenCalled();
  });

  it("stays silent once a device turned up in the meantime", async () => {
    listDeviceTokens.mockResolvedValue(["token-a"]);

    await expect(deliverChatDigest(job)).resolves.toBe("push available");

    expect(mail).not.toHaveBeenCalled();
  });

  it("still writes to someone who has a device but switched push off", async () => {
    listDeviceTokens.mockResolvedValue(["token-a"]);
    getProfile.mockResolvedValue({
      name: "Bo Kruse",
      email: "bo@example.com",
      locale: "en",
      notifyChatPush: false,
      notifyChatEmail: true,
    });

    await deliverChatDigest(job);

    expect(listDeviceTokens).not.toHaveBeenCalled();
    expect(mail).toHaveBeenCalled();
  });

  it("stays silent for an account whose address is a placeholder", async () => {
    getProfile.mockResolvedValue({
      email: "4915112345678@phone.cwa.local",
      locale: "en",
      notifyChatPush: true,
      notifyChatEmail: true,
    });

    await expect(deliverChatDigest(job)).resolves.toBe("no email address");

    expect(mail).not.toHaveBeenCalled();
  });

  it("stays silent when every unread row was deleted", async () => {
    listMessages.mockResolvedValue([
      { ...message(1, ANNA, ""), deletedAt: new Date().toISOString() },
    ]);

    await expect(deliverChatDigest(job)).resolves.toBe("nothing unread");

    expect(mail).not.toHaveBeenCalled();
  });

  it("lets a Resend throttle through so the worker can park", async () => {
    mail.mockRejectedValue(new MailRateLimitedError("slow down", 1_500));

    await expect(deliverChatDigest(job)).rejects.toBeInstanceOf(
      MailRateLimitedError,
    );
  });

  it("uses the singular when one message waits in a group", async () => {
    mail.mockResolvedValue(undefined);
    getConversation.mockResolvedValue(
      conversation({ kind: "group", title: "Saturday crew", lastSeq: 1 }),
    );
    listMessages.mockResolvedValue([message(1, ANNA, "Ten o'clock?")]);

    await deliverChatDigest(job);

    expect(rendered().subject).toBe("1 new message in Saturday crew");
    expect(rendered().intro).toBe("1 unread message in Saturday crew.");
  });
});
