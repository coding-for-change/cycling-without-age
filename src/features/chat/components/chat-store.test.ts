import type { RealtimeEvent } from "@/lib/realtime/events";
import type { ChatMessageView } from "../schemas";
import {
  addOptimistic,
  applyEvent,
  dropOptimistic,
  markFailed,
  prependMessages,
  reconcile,
  resetChatStore,
  setConversations,
  setMessages,
  setViewer,
  snapshot,
  upsertMessage,
} from "./chat-store";
import type { InboxItem } from "./types";

const message = (over: Partial<ChatMessageView> = {}): ChatMessageView => ({
  id: "m1",
  conversationId: "c1",
  seq: 1,
  senderId: "u1",
  kind: "text",
  text: "hello",
  meta: null,
  replyTo: null,
  clientId: null,
  editedAt: null,
  deletedAt: null,
  createdAt: "2026-09-17T10:00:00.000Z",
  reactions: [],
  ...over,
});

const conversation = (over: Partial<InboxItem> = {}): InboxItem => ({
  id: "c1",
  kind: "direct",
  origin: "manual",
  title: null,
  chapterId: null,
  announcementOnly: false,
  frozenAt: null,
  lastSeq: 1,
  lastMessageAt: "2026-09-17T10:00:00.000Z",
  otherUserId: "u2",
  memberCount: 2,
  lastMessage: message(),
  me: { role: "member", lastReadSeq: 0, mutedUntil: null },
  display: { name: "Anna", avatarSvg: null },
  online: false,
  lastMessageSenderName: "Anna",
  ...over,
});

const ids = (conversationId: string) =>
  (snapshot().messages.get(conversationId) ?? []).map((row) => row.id);

beforeEach(() => {
  resetChatStore();
  setViewer("me");
});

describe("conversation ordering", () => {
  it("puts the newest first and conversations without a message last", () => {
    setConversations([
      conversation({ id: "old", lastMessageAt: "2026-09-01T10:00:00.000Z" }),
      conversation({ id: "never", lastMessageAt: null }),
      conversation({ id: "new", lastMessageAt: "2026-09-17T10:00:00.000Z" }),
    ]);

    expect(snapshot().order.map((row) => row.id)).toEqual([
      "new",
      "old",
      "never",
    ]);
  });
});

describe("messages", () => {
  it("keeps an optimistic row at the end even though its seq is -1", () => {
    setMessages("c1", [message({ id: "a", seq: 7 })]);
    addOptimistic({
      conversationId: "c1",
      clientId: "draft-1",
      text: "later",
      senderId: "me",
      createdAt: "2026-09-17T11:00:00.000Z",
      replyTo: null,
    });

    expect(ids("c1")).toEqual(["a", "optimistic:draft-1"]);
  });

  it("replaces the optimistic row with the saved one", () => {
    setMessages("c1", []);
    addOptimistic({
      conversationId: "c1",
      clientId: "draft-1",
      text: "later",
      senderId: "me",
      createdAt: "2026-09-17T11:00:00.000Z",
      replyTo: null,
    });
    reconcile("draft-1", message({ id: "saved", seq: 8, clientId: "draft-1" }));

    expect(ids("c1")).toEqual(["saved"]);
    expect(snapshot().failed.has("draft-1")).toBe(false);
  });

  it("reconciles a stream event that beats the action result", () => {
    setMessages("c1", []);
    addOptimistic({
      conversationId: "c1",
      clientId: "draft-1",
      text: "later",
      senderId: "me",
      createdAt: "2026-09-17T11:00:00.000Z",
      replyTo: null,
    });
    upsertMessage(message({ id: "saved", seq: 8, clientId: "draft-1" }));

    expect(ids("c1")).toEqual(["saved"]);
  });

  it("marks a send as failed and drops it on demand", () => {
    setMessages("c1", []);
    addOptimistic({
      conversationId: "c1",
      clientId: "draft-1",
      text: "later",
      senderId: "me",
      createdAt: "2026-09-17T11:00:00.000Z",
      replyTo: null,
    });
    markFailed("draft-1");
    expect(snapshot().failed.has("draft-1")).toBe(true);

    dropOptimistic("c1", "draft-1");
    expect(ids("c1")).toEqual([]);
    expect(snapshot().failed.has("draft-1")).toBe(false);
  });

  it("prepends older pages without duplicating what is loaded", () => {
    setMessages("c1", [message({ id: "b", seq: 2 })]);
    prependMessages("c1", [
      message({ id: "a", seq: 1 }),
      message({ id: "b", seq: 2 }),
    ]);

    expect(ids("c1")).toEqual(["a", "b"]);
  });

  it("does not build a partial list for a conversation that is not open", () => {
    setConversations([conversation()]);
    upsertMessage(message({ id: "later", seq: 9 }));

    expect(snapshot().messages.has("c1")).toBe(false);
    expect(snapshot().conversations.get("c1")?.lastSeq).toBe(9);
  });
});

describe("applyEvent", () => {
  it("moves a conversation to the top when a message lands", () => {
    setConversations([
      conversation({ id: "c1", lastMessageAt: "2026-09-17T10:00:00.000Z" }),
      conversation({ id: "c2", lastMessageAt: "2026-09-17T12:00:00.000Z" }),
    ]);

    applyEvent({
      type: "message.created",
      conversationId: "c1",
      message: message({
        id: "new",
        seq: 5,
        createdAt: "2026-09-17T13:00:00.000Z",
      }),
    } satisfies RealtimeEvent);

    expect(snapshot().order.map((row) => row.id)).toEqual(["c1", "c2"]);
  });

  it("records another member's read position and the viewer's own", () => {
    setConversations([conversation()]);

    applyEvent({ type: "read", conversationId: "c1", userId: "u2", seq: 4 });
    applyEvent({ type: "read", conversationId: "c1", userId: "me", seq: 3 });

    expect(snapshot().reads.get("c1")?.get("u2")).toBe(4);
    expect(snapshot().conversations.get("c1")?.me.lastReadSeq).toBe(3);
  });

  it("never lets a read position go backwards", () => {
    setConversations([conversation()]);
    applyEvent({ type: "read", conversationId: "c1", userId: "u2", seq: 9 });
    applyEvent({ type: "read", conversationId: "c1", userId: "u2", seq: 2 });

    expect(snapshot().reads.get("c1")?.get("u2")).toBe(9);
  });

  it("drops the conversation when the viewer is the one who left", () => {
    setConversations([conversation({ kind: "group", memberCount: 4 })]);

    applyEvent({ type: "member.left", conversationId: "c1", userId: "me" });

    expect(snapshot().conversations.has("c1")).toBe(false);
  });

  it("counts a member down when somebody else leaves", () => {
    setConversations([conversation({ kind: "group", memberCount: 4 })]);

    applyEvent({ type: "member.left", conversationId: "c1", userId: "u2" });

    expect(snapshot().conversations.get("c1")?.memberCount).toBe(3);
  });

  it("patches only the fields the event carries", () => {
    setConversations([conversation({ kind: "group", title: "Saturday crew" })]);

    applyEvent({
      type: "conversation.updated",
      conversationId: "c1",
      patch: { announcementOnly: true },
    });

    const patched = snapshot().conversations.get("c1");
    expect(patched?.announcementOnly).toBe(true);
    expect(patched?.title).toBe("Saturday crew");
  });

  it("expires a typing entry on its own clock", () => {
    jest.useFakeTimers();
    applyEvent({
      type: "typing",
      conversationId: "c1",
      userId: "u2",
      typing: true,
      until: new Date(Date.now() + 5_000).toISOString(),
    });
    expect(snapshot().typingUsers.get("c1")).toEqual(["u2"]);

    jest.advanceTimersByTime(5_001);
    expect(snapshot().typingUsers.get("c1")).toBeUndefined();
    jest.useRealTimers();
  });

  it("turns presence on and off", () => {
    applyEvent({ type: "presence", userId: "u2", online: true });
    expect(snapshot().presence.has("u2")).toBe(true);

    applyEvent({ type: "presence", userId: "u2", online: false });
    expect(snapshot().presence.has("u2")).toBe(false);
  });
});
