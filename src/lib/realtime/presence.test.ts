import { closeRealtime } from "@/lib/realtime/hub";
import {
  connect,
  disconnect,
  heartbeat,
  isFocusedOn,
  isOnline,
  PRESENCE_TTL_SECONDS,
} from "@/lib/realtime/presence";

type FakeClient = {
  store: Map<string, string>;
  expires: Array<[string, number]>;
  published: Array<[string, string]>;
  existed: string[];
};

jest.mock("ioredis", () => {
  const clients: unknown[] = [];

  class FakeRedis {
    store = new Map<string, string>();
    expires: Array<[string, number]> = [];
    published: Array<[string, string]> = [];
    existed: string[] = [];

    constructor() {
      clients.push(this);
    }

    on() {
      return this;
    }

    async incr(key: string) {
      const next = Number(this.store.get(key) ?? 0) + 1;
      this.store.set(key, String(next));
      return next;
    }

    async decr(key: string) {
      const next = Number(this.store.get(key) ?? 0) - 1;
      this.store.set(key, String(next));
      return next;
    }

    async expire(key: string, seconds: number) {
      if (!this.store.has(key)) return 0;
      this.expires.push([key, seconds]);
      return 1;
    }

    async del(...keys: string[]) {
      return keys.filter((key) => this.store.delete(key)).length;
    }

    async set(key: string, value: string, token?: string, seconds?: number) {
      this.store.set(key, value);
      if (token === "EX" && seconds !== undefined)
        this.expires.push([key, seconds]);
      return "OK";
    }

    async get(key: string) {
      return this.store.get(key) ?? null;
    }

    async exists(key: string) {
      this.existed.push(key);
      return this.store.has(key) ? 1 : 0;
    }

    async publish(channel: string, payload: string) {
      this.published.push([channel, payload]);
      return 1;
    }

    pipeline() {
      const calls: Array<() => Promise<number>> = [];
      const chain = {
        exists: (key: string) => {
          calls.push(() => this.exists(key));
          return chain;
        },
        exec: async () =>
          Promise.all(calls.map(async (run) => [null, await run()])),
      };
      return chain;
    }

    async quit() {
      return "OK";
    }
  }

  return { __esModule: true, default: FakeRedis, clients };
});

const { clients } = jest.requireMock("ioredis") as { clients: FakeClient[] };

const frame = (userId: string, online: boolean) =>
  ["presence", JSON.stringify({ type: "presence", userId, online })] as const;

const client = () => clients[0];

beforeEach(() => {
  clients.length = 0;
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(async () => {
  await closeRealtime();
  jest.restoreAllMocks();
});

describe("connect", () => {
  it("counts the connection, keeps the focus and announces the first one", async () => {
    await connect("u1", "c1");

    expect(client().store.get("presence:u1")).toBe("1");
    expect(client().store.get("focus:u1")).toBe("c1");
    expect(client().expires).toEqual([
      ["presence:u1", PRESENCE_TTL_SECONDS],
      ["focus:u1", PRESENCE_TTL_SECONDS],
    ]);
    expect(client().published).toEqual([frame("u1", true)]);
  });

  it("stays silent on a second tab and drops a focus that is gone", async () => {
    await connect("u1", "c1");
    client().published.length = 0;

    await connect("u1", null);

    expect(client().store.get("presence:u1")).toBe("2");
    expect(client().store.has("focus:u1")).toBe(false);
    expect(client().published).toEqual([]);
  });
});

describe("heartbeat", () => {
  it("refreshes both keys without announcing anything", async () => {
    await connect("u1", "c1");
    client().published.length = 0;
    client().expires.length = 0;

    await heartbeat("u1", "c1");

    expect(client().expires).toEqual([
      ["presence:u1", PRESENCE_TTL_SECONDS],
      ["focus:u1", PRESENCE_TTL_SECONDS],
    ]);
    expect(client().published).toEqual([]);
  });

  it("reconnects and announces again when the key has expired", async () => {
    await connect("u1", "c1");
    client().store.delete("presence:u1");
    client().published.length = 0;

    await heartbeat("u1", "c1");

    expect(client().store.get("presence:u1")).toBe("1");
    expect(client().published).toEqual([frame("u1", true)]);
  });
});

describe("disconnect", () => {
  it("says nothing while another tab is still open", async () => {
    await connect("u1", null);
    await connect("u1", null);
    client().published.length = 0;
    client().expires.length = 0;

    await disconnect("u1");

    expect(client().store.get("presence:u1")).toBe("1");
    expect(client().expires).toEqual([["presence:u1", PRESENCE_TTL_SECONDS]]);
    expect(client().published).toEqual([]);
  });

  it("drops both keys and announces offline on the last tab", async () => {
    await connect("u1", "c1");
    client().published.length = 0;

    await disconnect("u1");

    expect(client().store.has("presence:u1")).toBe(false);
    expect(client().store.has("focus:u1")).toBe(false);
    expect(client().published).toEqual([frame("u1", false)]);
  });
});

describe("isOnline", () => {
  it("pipelines one EXISTS per user and returns the connected ones", async () => {
    await connect("u1", null);

    const online = await isOnline(["u1", "u2", "u1"]);

    expect(client().existed).toEqual(["presence:u1", "presence:u2"]);
    expect([...online]).toEqual(["u1"]);
  });

  it("asks nothing for an empty list", async () => {
    expect(await isOnline([])).toEqual(new Set());
    expect(clients).toHaveLength(0);
  });
});

describe("isFocusedOn", () => {
  it("is true only for the conversation the user is looking at", async () => {
    await connect("u1", "c1");

    expect(await isFocusedOn("u1", "c1")).toBe(true);
    expect(await isFocusedOn("u1", "c2")).toBe(false);
    expect(await isFocusedOn("u2", "c1")).toBe(false);
  });
});
