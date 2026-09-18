import type { RealtimeEvent } from "@/lib/realtime/events";
import {
  createChatStream,
  encodeFrame,
  HEARTBEAT_MS,
} from "@/lib/realtime/sse";

const decoder = new TextDecoder();

const read: RealtimeEvent = {
  type: "read",
  conversationId: "c1",
  userId: "u2",
  seq: 4,
};

const open: AbortController[] = [];

type HarnessOptions = {
  contactIds?: string[];
  focus?: string | null;
  refreshContacts?: () => Promise<string[]>;
  aborted?: boolean;
};

function harness({
  contactIds = ["u2"],
  focus = "c1",
  refreshContacts,
  aborted = false,
}: HarnessOptions = {}) {
  const handlers = new Map<string, (event: RealtimeEvent) => void>();
  const unsubscribed: string[] = [];
  const seen = {
    connect: [] as Array<[string, string | null]>,
    heartbeat: [] as Array<[string, string | null]>,
    disconnect: [] as string[],
  };

  const controller = new AbortController();
  open.push(controller);
  if (aborted) controller.abort();

  const stream = createChatStream({
    userId: "u1",
    focus,
    contactIds,
    subscribe: (channel, handler) => {
      handlers.set(channel, handler);
      return () => unsubscribed.push(channel);
    },
    presence: {
      connect: async (userId, at) => void seen.connect.push([userId, at]),
      heartbeat: async (userId, at) => void seen.heartbeat.push([userId, at]),
      disconnect: async (userId) => void seen.disconnect.push(userId),
    },
    signal: controller.signal,
    refreshContacts,
  });

  const reader = stream.getReader();
  const next = async () => {
    const { value, done } = await reader.read();
    return done ? null : decoder.decode(value);
  };
  const emit = (channel: string, event: RealtimeEvent) =>
    handlers.get(channel)?.(event);

  return { handlers, unsubscribed, seen, controller, reader, next, emit };
}

afterEach(() => {
  while (open.length > 0) open.pop()?.abort();
  jest.useRealTimers();
});

describe("encodeFrame", () => {
  it("writes id, event and data in the order the spec wants", () => {
    expect(encodeFrame({ id: 42, event: "read", data: { seq: 4 } })).toBe(
      'id: 42\nevent: read\ndata: {"seq":4}\n\n',
    );
  });

  it("leaves the id out when there is none", () => {
    expect(encodeFrame({ event: "presence", data: { online: true } })).toBe(
      'event: presence\ndata: {"online":true}\n\n',
    );
  });
});

describe("createChatStream", () => {
  it("opens with the retry line and subscribes to the three channels", async () => {
    const chat = harness();

    expect(await chat.next()).toBe("retry: 3000\n\n");
    expect([...chat.handlers.keys()]).toEqual([
      "user:u1",
      "conv:c1",
      "presence",
    ]);
    expect(chat.seen.connect).toEqual([["u1", "c1"]]);
  });

  it("skips the conversation channel when nothing is focused", async () => {
    const chat = harness({ focus: null });

    expect(await chat.next()).toBe("retry: 3000\n\n");
    expect([...chat.handlers.keys()]).toEqual(["user:u1", "presence"]);
  });

  it("frames a user event with an id and its type", async () => {
    const chat = harness();
    await chat.next();

    chat.emit("user:u1", read);
    const frame = await chat.next();

    expect(frame).toMatch(/^id: \d+\nevent: read\ndata: /);
    expect(JSON.parse(frame!.split("data: ")[1])).toEqual(read);
  });

  it("drops presence of people outside the contact set", async () => {
    const chat = harness({ contactIds: ["u2"] });
    await chat.next();

    chat.emit("presence", { type: "presence", userId: "u9", online: true });
    chat.emit("presence", { type: "presence", userId: "u2", online: true });

    expect(await chat.next()).toContain('"userId":"u2"');
  });

  it("never echoes the viewer's own presence", async () => {
    const chat = harness({ contactIds: ["u1", "u2"] });
    await chat.next();

    chat.emit("presence", { type: "presence", userId: "u1", online: true });
    chat.emit("presence", { type: "presence", userId: "u2", online: false });

    expect(await chat.next()).toContain('"userId":"u2"');
  });

  it("re-reads the contacts when a conversation is created", async () => {
    const chat = harness({
      contactIds: ["u2"],
      refreshContacts: async () => ["u9"],
    });
    await chat.next();

    chat.emit("user:u1", {
      type: "conversation.created",
      conversationId: "c2",
    });
    expect(await chat.next()).toContain("event: conversation.created");

    chat.emit("presence", { type: "presence", userId: "u2", online: true });
    chat.emit("presence", { type: "presence", userId: "u9", online: true });

    expect(await chat.next()).toContain('"userId":"u9"');
  });

  it("drops the viewer's own typing echo", async () => {
    const chat = harness();
    await chat.next();

    const typing = (userId: string): RealtimeEvent => ({
      type: "typing",
      conversationId: "c1",
      userId,
      typing: true,
      until: "2026-09-17T09:00:05.000Z",
    });
    chat.emit("conv:c1", typing("u1"));
    chat.emit("conv:c1", typing("u2"));

    expect(await chat.next()).toContain('"userId":"u2"');
  });

  it("pings and refreshes presence on every heartbeat", async () => {
    jest.useFakeTimers();
    const chat = harness();
    expect(await chat.next()).toBe("retry: 3000\n\n");

    await jest.advanceTimersByTimeAsync(HEARTBEAT_MS);

    expect(await chat.next()).toBe(": ping\n\n");
    expect(chat.seen.heartbeat).toEqual([["u1", "c1"]]);
  });

  it("unsubscribes, drops presence and closes when the request aborts", async () => {
    const chat = harness();
    await chat.next();

    chat.controller.abort();

    expect(chat.unsubscribed).toEqual(["presence", "conv:c1", "user:u1"]);
    expect(chat.seen.disconnect).toEqual(["u1"]);
    expect(await chat.next()).toBeNull();
  });

  it("cleans up when the reader cancels", async () => {
    const chat = harness();
    await chat.next();

    await chat.reader.cancel();

    expect(chat.unsubscribed).toHaveLength(3);
    expect(chat.seen.disconnect).toEqual(["u1"]);
  });

  it("closes at once when the request was aborted before the stream opened", async () => {
    const chat = harness({ aborted: true });

    expect(await chat.next()).toBeNull();
    expect(chat.handlers.size).toBe(0);
    expect(chat.seen.connect).toEqual([]);
    expect(chat.seen.disconnect).toEqual([]);
  });
});
