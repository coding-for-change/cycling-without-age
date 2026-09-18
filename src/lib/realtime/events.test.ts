import {
  chatMessageView,
  parseRealtimeEvent,
  realtimeEvent,
  type ChatMessageView,
  type RealtimeEvent,
} from "@/lib/realtime/events";

const message: ChatMessageView = {
  id: "m1",
  conversationId: "c1",
  seq: 3,
  senderId: "u1",
  kind: "text",
  text: "See you at **six**",
  meta: null,
  replyTo: null,
  clientId: "draft-1",
  editedAt: null,
  deletedAt: null,
  createdAt: "2026-09-17T09:00:00.000Z",
  reactions: [{ emoji: "👍", userIds: ["u2"] }],
};

const events: RealtimeEvent[] = [
  { type: "message.created", conversationId: "c1", message },
  {
    type: "message.updated",
    conversationId: "c1",
    message: { ...message, editedAt: "2026-09-17T09:01:00.000Z" },
  },
  {
    type: "reaction.changed",
    conversationId: "c1",
    messageId: "m1",
    reactions: [{ emoji: "❤️", userIds: ["u2", "u3"] }],
  },
  {
    type: "conversation.updated",
    conversationId: "c1",
    patch: { memberCount: 4, frozenAt: null },
  },
  { type: "conversation.created", conversationId: "c2" },
  { type: "member.left", conversationId: "c1", userId: "u3" },
  { type: "read", conversationId: "c1", userId: "u2", seq: 3 },
  {
    type: "typing",
    conversationId: "c1",
    userId: "u2",
    typing: true,
    until: "2026-09-17T09:00:05.000Z",
  },
  { type: "presence", userId: "u2", online: true },
];

describe("realtimeEvent", () => {
  for (const event of events)
    it(`parses ${event.type} unchanged through JSON`, () => {
      expect(realtimeEvent.parse(JSON.parse(JSON.stringify(event)))).toEqual(
        event,
      );
    });

  it("accepts a system row with empty text", () => {
    const system: ChatMessageView = {
      ...message,
      kind: "system",
      senderId: null,
      text: "",
      clientId: null,
      meta: { type: "left", actorUserId: "u3" },
    };
    expect(chatMessageView.parse(system)).toEqual(system);
  });

  it("rejects an unknown event type", () => {
    expect(realtimeEvent.safeParse({ type: "message.burned" }).success).toBe(
      false,
    );
  });

  it("rejects a Date where the contract promises an ISO string", () => {
    const withDate = { ...message, createdAt: new Date() };
    expect(chatMessageView.safeParse(withDate).success).toBe(false);
  });

  it("rejects a fractional sequence number", () => {
    expect(
      realtimeEvent.safeParse({
        type: "read",
        conversationId: "c1",
        userId: "u2",
        seq: 1.5,
      }).success,
    ).toBe(false);
  });

  it("drops unknown keys from a conversation patch", () => {
    const parsed = realtimeEvent.parse({
      type: "conversation.updated",
      conversationId: "c1",
      patch: { announcementOnly: true, kind: "group" },
    });
    expect(parsed).toEqual({
      type: "conversation.updated",
      conversationId: "c1",
      patch: { announcementOnly: true },
    });
  });
});

describe("parseRealtimeEvent", () => {
  it("returns the event when it matches the union", () => {
    expect(parseRealtimeEvent(events[4])).toEqual(events[4]);
  });

  it("returns null for anything else", () => {
    expect(parseRealtimeEvent({ type: "read" })).toBeNull();
    expect(parseRealtimeEvent("presence")).toBeNull();
    expect(parseRealtimeEvent(null)).toBeNull();
  });
});
