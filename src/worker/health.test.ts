import { checkHealth } from "@/worker/health";

jest.mock("@/lib/events/queues", () => ({
  QUEUE: {
    events: "events",
    handlers: "handlers",
    email: "email",
    push: "push",
  },
  queue: jest.fn(),
}));

const worker = (name: string, running = true) => ({
  name,
  isRunning: () => running,
});
const workers = [
  worker("events"),
  worker("handlers"),
  worker("email"),
  worker("push"),
];

describe("checkHealth", () => {
  it("is healthy when every worker runs and Redis answers", async () => {
    await expect(
      checkHealth(workers, { ping: async () => 0 }),
    ).resolves.toEqual({ ok: true });
  });

  it("names the workers that stopped and skips the ping", async () => {
    const ping = jest.fn();

    const result = await checkHealth(
      [worker("events"), worker("handlers", false), worker("email")],
      { ping },
    );

    expect(result).toEqual({ ok: false, reason: "workers stopped: handlers" });
    expect(ping).not.toHaveBeenCalled();
  });

  it("reports a Redis that rejects", async () => {
    const result = await checkHealth(workers, {
      ping: async () => {
        throw new Error("ECONNREFUSED");
      },
    });

    expect(result).toEqual({ ok: false, reason: "redis: ECONNREFUSED" });
  });

  it("reports a Redis that never answers", async () => {
    const result = await checkHealth(workers, {
      ping: () => new Promise(() => {}),
      timeoutMs: 10,
    });

    expect(result).toEqual({
      ok: false,
      reason: "redis: no answer within 10ms",
    });
  });
});
