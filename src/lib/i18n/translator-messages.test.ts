import { logger } from "@/lib/observability/logger";
import { formatMessage } from "./format";
import type { Dictionary } from "./messages";
import { liveMessages } from "./translator-messages";

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
    .mockResolvedValue(new Response(JSON.stringify({ de: live })));

const load = async () =>
  (await liveMessages("de", bundled)) as unknown as Messages;

beforeEach(() => {
  process.env.TOLGEE_PROJECT_ID = "35299";
  process.env.TOLGEE_API_KEY = "tgpak_test";
  jest.mocked(logger.warn).mockClear();
});

afterEach(() => jest.restoreAllMocks());

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
