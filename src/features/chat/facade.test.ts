import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime";
import { chat, MAX_MESSAGE_CHARS } from "@/features/chat";
import {
  encryptText,
  generateDek,
  unwrapDek,
  wrapDek,
} from "@/lib/crypto/chat-cipher";

jest.mock("@/lib/prisma", () => {
  const client: Record<string, unknown> = {
    conversation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    conversationMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    chatMessage: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    chatReaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    event: { create: jest.fn(async () => ({ id: "event-1" })) },
    $queryRaw: jest.fn(async () => []),
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
jest.mock("@/lib/realtime", () => ({
  publish: jest.fn(async () => {}),
  publishToUsers: jest.fn(async () => {}),
  userChannel: (id: string) => `user:${id}`,
  conversationChannel: (id: string) => `conv:${id}`,
}));

process.env.CHAT_MASTER_KEY = Buffer.alloc(32, 7).toString("base64");

const db = prisma as unknown as {
  conversation: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  conversationMember: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  chatMessage: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  chatReaction: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  event: { create: jest.Mock };
};

const CONVERSATION = "conversation-saturday";
const CHAPTER = "chapter-muenchen";
const ME = "user-anke";
const OTHER = "user-pernille";
const MESSAGE = "message-1";

const envelope = wrapDek(generateDek());
const dek = unwrapDek(envelope.wrapped, envelope.keyVersion);

const conversation = (over: Record<string, unknown> = {}) => ({
  id: CONVERSATION,
  kind: "group",
  origin: "manual",
  title: "Saturday crew",
  chapterId: CHAPTER,
  createdByUserId: ME,
  directKey: null,
  dek: envelope.wrapped,
  keyVersion: envelope.keyVersion,
  announcementOnly: false,
  lastSeq: 7,
  lastMessageId: null,
  lastMessageAt: null,
  frozenAt: null,
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  updatedAt: new Date("2026-09-01T10:00:00.000Z"),
  ...over,
});

const membership = (over: Record<string, unknown> = {}) => ({
  conversationId: CONVERSATION,
  userId: ME,
  role: "member",
  joinedAt: new Date("2026-09-01T10:00:00.000Z"),
  lastReadSeq: 0,
  lastReadAt: null,
  mutedUntil: null,
  ...over,
});

const storedMessage = (over: Record<string, unknown> = {}) => ({
  id: MESSAGE,
  conversationId: CONVERSATION,
  seq: 3,
  senderId: ME,
  kind: "text",
  body: encryptText(dek, "See you Saturday", CONVERSATION),
  meta: null,
  replyToId: null,
  clientId: "client-1",
  editedAt: null,
  deletedAt: null,
  createdAt: new Date(),
  reactions: [],
  replyTo: null,
  ...over,
});

const send = (text = "See you Saturday") =>
  chat.sendMessage({
    conversationId: CONVERSATION,
    senderId: ME,
    text,
    clientId: "client-1",
  });

beforeEach(() => {
  jest.clearAllMocks();
  db.conversation.findUnique.mockResolvedValue(conversation());
  db.conversation.update.mockResolvedValue({ id: CONVERSATION });
  db.conversationMember.findUnique.mockResolvedValue(membership());
  db.conversationMember.findMany.mockResolvedValue([
    { userId: ME },
    { userId: OTHER },
  ]);
  db.conversationMember.deleteMany.mockResolvedValue({ count: 1 });
  db.chatMessage.findUnique.mockResolvedValue(null);
  db.chatMessage.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      ...storedMessage(),
      ...data,
      meta: data.meta ?? null,
      replyToId: data.replyToId ?? null,
      clientId: data.clientId ?? null,
      createdAt: new Date("2026-09-17T12:00:00.000Z"),
    }),
  );
  db.chatMessage.update.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      ...storedMessage(),
      ...data,
    }),
  );
});

describe("sending a message", () => {
  it("gives the message the next sequence number and stamps the conversation", async () => {
    const message = await send();

    expect(message.seq).toBe(8);
    expect(db.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastSeq: 8, lastMessageId: MESSAGE }),
      }),
    );
    expect(db.event.create.mock.calls[0][0].data).toMatchObject({
      type: "chat.messageSent",
      chapterId: CHAPTER,
      actorUserId: ME,
      payload: expect.objectContaining({
        seq: 8,
        conversationId: CONVERSATION,
      }),
    });
  });

  it("stores the text encrypted and reads it back", async () => {
    const message = await send("See you Saturday");
    const stored = db.chatMessage.create.mock.calls[0][0].data.body as Buffer;

    expect(message.text).toBe("See you Saturday");
    expect(stored.toString("utf8")).not.toContain("Saturday");
  });

  it("refuses someone who is not a member", async () => {
    db.conversationMember.findUnique.mockResolvedValue(null);

    await expect(send()).rejects.toMatchObject({ code: "notMember" });
    expect(db.chatMessage.create).not.toHaveBeenCalled();
  });

  it("refuses a frozen conversation", async () => {
    db.conversation.findUnique.mockResolvedValue(
      conversation({ frozenAt: new Date() }),
    );

    await expect(send()).rejects.toMatchObject({ code: "frozen" });
    expect(db.chatMessage.create).not.toHaveBeenCalled();
  });

  it("refuses anyone but the owner while announcements are on", async () => {
    db.conversation.findUnique.mockResolvedValue(
      conversation({ announcementOnly: true }),
    );

    await expect(send()).rejects.toMatchObject({ code: "announcementOnly" });

    db.conversationMember.findUnique.mockResolvedValue(
      membership({ role: "owner" }),
    );
    await expect(send()).resolves.toMatchObject({ seq: 8 });
  });

  it("refuses a message longer than the limit", async () => {
    await expect(send("a".repeat(MAX_MESSAGE_CHARS + 1))).rejects.toMatchObject(
      { code: "tooLong" },
    );
    expect(db.chatMessage.create).not.toHaveBeenCalled();
  });

  it("answers a repeated client id with the row it already wrote", async () => {
    db.chatMessage.findUnique.mockResolvedValue(storedMessage());

    const message = await send();

    expect(message.id).toBe(MESSAGE);
    expect(message.text).toBe("See you Saturday");
    expect(db.chatMessage.create).not.toHaveBeenCalled();
    expect(db.event.create).not.toHaveBeenCalled();
  });
});

describe("editing a message", () => {
  it("refuses once the edit window has closed", async () => {
    db.chatMessage.findUnique.mockResolvedValue({
      ...storedMessage({ createdAt: new Date(Date.now() - 20 * 60_000) }),
      conversation: conversation(),
    });

    await expect(
      chat.editMessage({ messageId: MESSAGE, userId: ME, text: "Sunday" }),
    ).rejects.toMatchObject({ code: "editWindowClosed" });
    expect(db.chatMessage.update).not.toHaveBeenCalled();
  });

  it("refuses someone who did not write it", async () => {
    db.chatMessage.findUnique.mockResolvedValue({
      ...storedMessage(),
      conversation: conversation(),
    });

    await expect(
      chat.editMessage({ messageId: MESSAGE, userId: OTHER, text: "Sunday" }),
    ).rejects.toMatchObject({ code: "notSender" });
  });

  it("rewrites the body and answers with the new text", async () => {
    db.chatMessage.findUnique.mockResolvedValue({
      ...storedMessage(),
      conversation: conversation(),
    });

    const message = await chat.editMessage({
      messageId: MESSAGE,
      userId: ME,
      text: "Sunday instead",
    });

    expect(message.text).toBe("Sunday instead");
    expect(message.editedAt).not.toBeNull();
  });
});

describe("leaving", () => {
  it("refuses to leave a direct chat", async () => {
    db.conversation.findUnique.mockResolvedValue(
      conversation({ kind: "direct" }),
    );

    await expect(
      chat.leaveGroup({ conversationId: CONVERSATION, userId: ME }),
    ).rejects.toMatchObject({ code: "cannotLeaveDirect" });
    expect(db.conversationMember.deleteMany).not.toHaveBeenCalled();
  });

  it("writes a system line through the same sequence", async () => {
    await chat.leaveGroup({ conversationId: CONVERSATION, userId: ME });

    expect(db.conversationMember.deleteMany).toHaveBeenCalled();
    expect(db.chatMessage.create.mock.calls[0][0].data).toMatchObject({
      kind: "system",
      seq: 8,
      senderId: null,
      meta: { type: "left", actorUserId: ME },
    });
  });
});

describe("announcement mode", () => {
  it("refuses to switch off above the threshold", async () => {
    db.conversationMember.findUnique.mockResolvedValue(
      membership({ role: "owner" }),
    );
    db.conversationMember.findMany.mockResolvedValue(
      Array.from({ length: 101 }, (_, index) => ({ userId: `user-${index}` })),
    );

    await expect(
      chat.setAnnouncementOnly({
        conversationId: CONVERSATION,
        userId: ME,
        on: false,
      }),
    ).rejects.toMatchObject({ code: "aboveThreshold" });
    expect(db.conversation.update).not.toHaveBeenCalled();
  });

  it("refuses anyone but the owner", async () => {
    await expect(
      chat.setAnnouncementOnly({
        conversationId: CONVERSATION,
        userId: ME,
        on: true,
      }),
    ).rejects.toMatchObject({ code: "notOwner" });
  });
});

describe("reaching past a conversation", () => {
  const foreign = (over: Record<string, unknown> = {}) => ({
    ...storedMessage({ conversationId: "conversation-elsewhere", ...over }),
    conversation: conversation({ id: "conversation-elsewhere" }),
  });

  it("drops a reply that points at another conversation", async () => {
    db.chatMessage.findUnique.mockImplementation(
      async ({ where }: { where: Record<string, unknown> }) =>
        where.id ? foreign({ id: "message-elsewhere" }) : null,
    );

    await chat.sendMessage({
      conversationId: CONVERSATION,
      senderId: ME,
      text: "See you Saturday",
      clientId: "client-2",
      replyToId: "message-elsewhere",
    });

    expect(db.chatMessage.create.mock.calls[0][0].data.replyToId).toBeNull();
  });

  it("refuses to edit a message of a conversation the editor is not in", async () => {
    db.chatMessage.findUnique.mockResolvedValue(foreign());
    db.conversationMember.findUnique.mockResolvedValue(null);

    await expect(
      chat.editMessage({ messageId: MESSAGE, userId: ME, text: "Sunday" }),
    ).rejects.toMatchObject({ code: "notMember" });
    expect(db.chatMessage.update).not.toHaveBeenCalled();
  });

  it("refuses to delete someone else's message", async () => {
    db.chatMessage.findUnique.mockResolvedValue({
      ...storedMessage(),
      conversation: conversation(),
    });

    await expect(
      chat.deleteMessage({ messageId: MESSAGE, userId: OTHER }),
    ).rejects.toMatchObject({ code: "notSender" });
    expect(db.chatMessage.update).not.toHaveBeenCalled();
  });

  it("refuses to react to a message of a conversation one is not in", async () => {
    db.chatMessage.findUnique.mockResolvedValue(foreign());
    db.conversationMember.findUnique.mockResolvedValue(null);

    await expect(
      chat.toggleReaction({ messageId: MESSAGE, userId: ME, emoji: "👍" }),
    ).rejects.toMatchObject({ code: "notMember" });
    expect(db.chatReaction.create).not.toHaveBeenCalled();
  });

  it("refuses to read the messages of a conversation one is not in", async () => {
    db.conversationMember.findUnique.mockResolvedValue(null);

    await expect(chat.listMessages(CONVERSATION, ME)).rejects.toMatchObject({
      code: "notMember",
    });
    expect(db.chatMessage.findMany).not.toHaveBeenCalled();
  });

  it("refuses to mark a foreign conversation read", async () => {
    db.conversationMember.findUnique.mockResolvedValue(null);

    await expect(
      chat.markRead({ conversationId: CONVERSATION, userId: ME, seq: 3 }),
    ).rejects.toMatchObject({ code: "notMember" });
    expect(db.conversationMember.update).not.toHaveBeenCalled();
  });

  it("never reads further than the conversation has gone", async () => {
    const { lastReadSeq } = await chat.markRead({
      conversationId: CONVERSATION,
      userId: ME,
      seq: 9_000,
    });

    expect(lastReadSeq).toBe(7);
  });

  it("refuses to mute or leave a foreign conversation", async () => {
    db.conversationMember.findUnique.mockResolvedValue(null);

    await expect(
      chat.setMute({ conversationId: CONVERSATION, userId: ME, until: null }),
    ).rejects.toMatchObject({ code: "notMember" });
    await expect(
      chat.leaveGroup({ conversationId: CONVERSATION, userId: ME }),
    ).rejects.toMatchObject({ code: "notMember" });
    expect(db.conversationMember.update).not.toHaveBeenCalled();
    expect(db.conversationMember.deleteMany).not.toHaveBeenCalled();
  });

  it("tells nobody outside the conversation that someone is typing", async () => {
    db.conversationMember.findUnique.mockResolvedValue(null);

    await expect(
      chat.setTyping({
        conversationId: CONVERSATION,
        userId: ME,
        typing: true,
      }),
    ).rejects.toMatchObject({ code: "notMember" });
    expect(publish).not.toHaveBeenCalled();
  });
});
