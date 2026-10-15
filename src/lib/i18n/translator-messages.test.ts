import type { Dictionary } from "./messages";

type Module = typeof import("./translator-messages");

jest.mock("@/lib/observability/logger", () => ({
  logger: { warn: jest.fn() },
}));

const bundled = {
  passkeys: { removeConfirm: "{name} entfernen?" },
  fleet: { seats: "{count, plural, one {1 Sitzplatz} other {# Sitzplätze}}" },
  save: "Speichern",
} as unknown as Dictionary;

type Messages = {
  passkeys: { removeConfirm: string };
  fleet: { seats: string };
  save: string;
};

const visible = (text: string) => text.replace(/[‌‍]/g, "");

const serve = (live: object) =>
  jest
    .spyOn(global, "fetch")
    .mockImplementation(async () => new Response(JSON.stringify({ de: live })));

let liveMessages: Module["liveMessages"];
let taggedBundled: Module["taggedBundled"];
let LIVE_TTL_MS: number;
let BREAKER_MS: number;
let logger: { warn: jest.Mock };
let formatMessage: typeof import("./format").formatMessage;

const load = async () =>
  (await liveMessages("de", bundled)) as unknown as Messages;

beforeEach(async () => {
  jest.resetModules();
  process.env.TOLGEE_PROJECT_ID = "35299";
  process.env.TOLGEE_READ_KEY = "tgpak_test";
  ({ liveMessages, taggedBundled, LIVE_TTL_MS, BREAKER_MS } =
    await import("./translator-messages"));
  ({ formatMessage } = await import("./format"));
  logger = (await import("@/lib/observability/logger")).logger as never;
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("liveMessages", () => {
  it("uses a live edit that keeps the placeholders", async () => {
    serve({
      passkeys: { removeConfirm: "{name} wirklich entfernen?" },
      save: "Sichern",
    });
    const messages = await load();
    expect(visible(messages.passkeys.removeConfirm)).toBe(
      "{name} wirklich entfernen?",
    );
    expect(visible(messages.save)).toBe("Sichern");
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("keeps the bundled text when the live one is broken ICU", async () => {
    serve({
      fleet: {
        seats: "{count, plural, one {1 Sitzplatz} other {# Sitzplätze}",
      },
    });
    const messages = await load();
    expect(formatMessage(messages.fleet.seats, { count: 3 }, "de")).toContain(
      "3 Sitzplätze",
    );
    expect(logger.warn).toHaveBeenCalledWith(
      { key: "fleet.seats", locale: "de" },
      "tolgee translation rejected",
    );
  });

  it("keeps the bundled text when a placeholder is renamed", async () => {
    serve({ passkeys: { removeConfirm: "{Name} entfernen?" } });
    const messages = await load();
    expect(
      visible(
        formatMessage(
          messages.passkeys.removeConfirm,
          { name: "iPhone" },
          "de",
        ),
      ),
    ).toBe("iPhone entfernen?");
  });

  it("keeps the bundled text when a placeholder is dropped", async () => {
    serve({ passkeys: { removeConfirm: "Passkey entfernen?" } });
    const messages = await load();
    expect(visible(messages.passkeys.removeConfirm)).toBe("{name} entfernen?");
  });

  it("keeps the bundled text when a plural is missing its other form", async () => {
    serve({ fleet: { seats: "{count, plural, one {1 Sitzplatz}}" } });
    const messages = await load();
    expect(visible(messages.fleet.seats)).toBe(
      "{count, plural, one {1 Sitzplatz} other {# Sitzplätze}}",
    );
  });
});

describe("liveMessages caching", () => {
  it("returns the identical object within the TTL", async () => {
    const fetch = serve({ save: "Sichern" });
    const first = await load();
    expect(await load()).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shares one fetch between concurrent renders", async () => {
    const fetch = serve({ save: "Sichern" });
    const results = await Promise.all(Array.from({ length: 20 }, load));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new Set(results).size).toBe(1);
  });

  it("serves the last value while one refresh runs after the TTL", async () => {
    jest.useFakeTimers({ now: 0, doNotFake: ["setImmediate"] });
    const fetch = serve({ save: "Sichern" });
    const first = await load();
    jest.setSystemTime(LIVE_TTL_MS + 1);
    const [stale, again] = await Promise.all([load(), load()]);
    expect(stale).toBe(first);
    expect(again).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(2);
    await new Promise((resolve) => setImmediate(resolve));
    const refreshed = await load();
    expect(refreshed).not.toBe(first);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("the Tolgee breaker", () => {
  const fail = (status: number) => {
    const body = new ReadableStream();
    const cancel = jest.spyOn(body, "cancel");
    const fetch = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(body, { status }));
    return { fetch, cancel };
  };

  it("cancels the body of a failed response", async () => {
    const { cancel } = fail(404);
    await load();
    expect(cancel).toHaveBeenCalled();
  });

  it("trips on 444 and skips Tolgee for five minutes", async () => {
    jest.useFakeTimers({ now: 0 });
    const { fetch, cancel } = fail(444);
    const first = await load();
    expect(cancel).toHaveBeenCalled();
    expect(first).toBe(taggedBundled("de", bundled));
    expect(visible(first.save)).toBe("Speichern");
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      { event: "i18n.tolgee_breaker_open" },
      "tolgee breaker open",
    );

    jest.setSystemTime(BREAKER_MS - 1);
    await Promise.all(Array.from({ length: 50 }, load));
    expect(fetch).toHaveBeenCalledTimes(1);

    jest.setSystemTime(BREAKER_MS + 1);
    serve({ save: "Sichern" });
    expect(visible((await load()).save)).toBe("Sichern");
  });

  it("trips on a network error", async () => {
    const fetch = jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new TypeError("fetch failed"));
    await load();
    await load();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
