import {
  closeRealtime,
  publish,
  publishToUsers,
  subscribe,
} from "@/lib/realtime/hub";
import type { RealtimeEvent } from "@/lib/realtime/events";

type FakeClient = {
  subscribed: string[];
  unsubscribed: string[];
  published: Array<[string, string]>;
  pipelines: Array<Array<[string, string]>>;
  quits: number;
  hang: boolean;
  failure: Error | null;
  deliver: (channel: string, payload: string) => void;
};

jest.mock("ioredis", () => {
  const clients: unknown[] = [];

  class FakeRedis {
    subscribed: string[] = [];
    unsubscribed: string[] = [];
    published: Array<[string, string]> = [];
    pipelines: Array<Array<[string, string]>> = [];
    quits = 0;
    hang = false;
    failure: Error | null = null;
    listeners = new Map<string, Array<(...args: string[]) => void>>();

    constructor() {
      clients.push(this);
    }

    on(event: string, handler: (...args: string[]) => void) {
      this.listeners.set(event, [
        ...(this.listeners.get(event) ?? []),
        handler,
      ]);
      return this;
    }

    deliver(channel: string, payload: string) {
      for (const handler of this.listeners.get("message") ?? [])
        handler(channel, payload);
    }

    async subscribe(channel: string) {
      this.subscribed.push(channel);
      return this.subscribed.length;
    }

    async unsubscribe(channel: string) {
      this.unsubscribed.push(channel);
      return 0;
    }

    publish(channel: string, payload: string) {
      this.published.push([channel, payload]);
      if (this.failure) return Promise.reject(this.failure);
      return this.hang ? new Promise<number>(() => {}) : Promise.resolve(1);
    }

    pipeline() {
      const commands: Array<[string, string]> = [];
      this.pipelines.push(commands);
      const chain = {
        publish: (channel: string, payload: string) => {
          commands.push([channel, payload]);
          return chain;
        },
        exec: () =>
          this.hang ? new Promise<unknown[]>(() => {}) : Promise.resolve([]),
      };
      return chain;
    }

    async quit() {
      this.quits += 1;
      return "OK";
    }
  }

  return { __esModule: true, default: FakeRedis, clients };
});

const { clients } = jest.requireMock("ioredis") as { clients: FakeClient[] };

const read: RealtimeEvent = {
  type: "read",
  conversationId: "c1",
  userId: "u1",
  seq: 7,
};

beforeEach(() => {
  clients.length = 0;
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(async () => {
  await closeRealtime();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("subscribe", () => {
  it("subscribes once per channel and unsubscribes with the last handler", () => {
    const first = jest.fn();
    const second = jest.fn();

    const offFirst = subscribe("conv:1", first);
    const offSecond = subscribe("conv:1", second);
    const [client] = clients;

    expect(client.subscribed).toEqual(["conv:1"]);

    offFirst();
    expect(client.unsubscribed).toEqual([]);

    offSecond();
    expect(client.unsubscribed).toEqual(["conv:1"]);
  });

  it("uses one subscriber connection for every channel", () => {
    subscribe("conv:1", jest.fn());
    subscribe("presence", jest.fn());

    expect(clients).toHaveLength(1);
    expect(clients[0].subscribed).toEqual(["conv:1", "presence"]);
  });

  it("ignores a second call of the same unsubscribe", () => {
    const off = subscribe("conv:1", jest.fn());
    subscribe("conv:1", jest.fn());

    off();
    off();

    expect(clients[0].unsubscribed).toEqual([]);
  });

  it("hands every handler on the channel the parsed event", () => {
    const first = jest.fn();
    const second = jest.fn();
    subscribe("conv:1", first);
    subscribe("conv:1", second);

    clients[0].deliver("conv:1", JSON.stringify(read));

    expect(first).toHaveBeenCalledWith(read);
    expect(second).toHaveBeenCalledWith(read);
  });

  it("keeps delivering when one handler throws", () => {
    const angry = jest.fn(() => {
      throw new Error("boom");
    });
    const calm = jest.fn();
    subscribe("conv:1", angry);
    subscribe("conv:1", calm);

    clients[0].deliver("conv:1", JSON.stringify(read));

    expect(calm).toHaveBeenCalledWith(read);
  });

  it("drops payloads that are not valid realtime events", () => {
    const handler = jest.fn();
    subscribe("conv:1", handler);

    clients[0].deliver("conv:1", "not json at all");
    clients[0].deliver("conv:1", JSON.stringify({ type: "message.burned" }));
    clients[0].deliver(
      "conv:1",
      JSON.stringify({ ...read, seq: "seven" as unknown as number }),
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores messages on channels nobody listens to", () => {
    const handler = jest.fn();
    subscribe("conv:1", handler);

    clients[0].deliver("conv:2", JSON.stringify(read));

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("publish", () => {
  it("sends the event as JSON on the channel", async () => {
    await publish("conv:1", read);

    expect(clients[0].published).toEqual([["conv:1", JSON.stringify(read)]]);
  });

  it("keeps the message out of the log when the connection breaks", async () => {
    const message: RealtimeEvent = {
      type: "message.created",
      conversationId: "c1",
      message: {
        id: "m1",
        conversationId: "c1",
        seq: 1,
        senderId: "u1",
        kind: "text",
        text: "meet me behind the bike shed",
        meta: null,
        replyTo: null,
        clientId: null,
        editedAt: null,
        deletedAt: null,
        createdAt: "2026-09-17T10:00:00.000Z",
        reactions: [],
      },
    };
    await publish("conv:1", message);
    const broken: Error & { command?: unknown } = new Error(
      "Connection is closed.",
    );
    broken.command = {
      name: "publish",
      args: ["conv:1", JSON.stringify(message)],
    };
    clients[0].failure = broken;

    await expect(publish("conv:1", message)).resolves.toBeUndefined();

    const logged = JSON.stringify((console.error as jest.Mock).mock.calls);
    expect(logged).toContain("Connection is closed.");
    expect(logged).not.toContain("bike shed");
  });

  it("gives up after the timeout instead of failing the caller", async () => {
    jest.useFakeTimers();
    await publish("conv:1", read);
    clients[0].hang = true;

    const pending = publish("conv:1", read);
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(pending).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("publishToUsers", () => {
  it("pipelines one publish per user channel", async () => {
    await publishToUsers(["u1", "u2", "u1"], read);

    expect(clients[0].pipelines).toEqual([
      [
        ["user:u1", JSON.stringify(read)],
        ["user:u2", JSON.stringify(read)],
      ],
    ]);
  });

  it("does nothing without recipients", async () => {
    await publishToUsers([], read);

    expect(clients).toHaveLength(0);
  });

  it("swallows a pipeline that never answers", async () => {
    jest.useFakeTimers();
    await publishToUsers(["u1"], read);
    clients[0].hang = true;

    const pending = publishToUsers(["u1"], read);
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(pending).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("closeRealtime", () => {
  it("quits both connections and forgets the handlers", async () => {
    subscribe("conv:1", jest.fn());
    await publish("conv:1", read);
    const opened = [...clients];

    await closeRealtime();

    expect(opened.map((client) => client.quits)).toEqual([1, 1]);

    subscribe("conv:1", jest.fn());
    expect(clients).toHaveLength(3);
  });
});
