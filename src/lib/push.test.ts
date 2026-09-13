import {
  isInvalidTokenError,
  isPushConfigured,
  parseServiceAccount,
  sendPush,
} from "@/lib/push";

const sendEachForMulticast = jest.fn();

jest.mock("firebase-admin/app", () => ({
  cert: jest.fn((account: unknown) => ({ credential: account })),
  getApps: jest.fn(() => [{ name: "[DEFAULT]" }]),
  initializeApp: jest.fn(() => ({ name: "[DEFAULT]" })),
}));

jest.mock("firebase-admin/messaging", () => ({
  getMessaging: jest.fn(() => ({ sendEachForMulticast })),
}));

const account = {
  project_id: "cwa-dev",
  client_email: "push@cwa-dev.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
};
const raw = JSON.stringify(account);
const parsed = {
  projectId: "cwa-dev",
  clientEmail: "push@cwa-dev.iam.gserviceaccount.com",
  privateKey: account.private_key,
};

const ok = () => ({ success: true });
const failed = (code: string, message = "") => ({
  success: false,
  error: { code, message },
});
const respond = (...responses: object[]) => ({ responses });

const before = process.env.FIREBASE_SERVICE_ACCOUNT;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.FIREBASE_SERVICE_ACCOUNT = raw;
});

afterAll(() => {
  process.env.FIREBASE_SERVICE_ACCOUNT = before;
});

describe("parseServiceAccount", () => {
  it("reads the raw JSON a developer pastes into .env.local", () => {
    expect(parseServiceAccount(raw)).toEqual(parsed);
  });

  // The deploy vault writes `key=value` lines, so a multi-line JSON only
  // survives base64-encoded.
  it("reads the base64 the deploy vault carries", () => {
    expect(parseServiceAccount(Buffer.from(raw).toString("base64"))).toEqual(
      parsed,
    );
  });

  it("treats unset and blank as not configured", () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    expect(parseServiceAccount()).toBeNull();
    expect(parseServiceAccount("   ")).toBeNull();
  });

  it("throws on a value that is neither JSON nor base64 JSON", () => {
    expect(() => parseServiceAccount("not-a-key")).toThrow(
      /not valid JSON or base64/,
    );
  });

  it("throws when a credential field is missing", () => {
    expect(() =>
      parseServiceAccount(JSON.stringify({ project_id: "cwa-dev" })),
    ).toThrow(/missing project_id, client_email or private_key/);
  });
});

describe("isPushConfigured", () => {
  it("follows the environment", () => {
    expect(isPushConfigured()).toBe(true);
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    expect(isPushConfigured()).toBe(false);
  });
});

describe("isInvalidTokenError", () => {
  it.each([
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
  ])("retires the device on %s", (code) => {
    expect(isInvalidTokenError({ code })).toBe(true);
  });

  // invalid-argument covers every malformed field, so only the message tells a
  // dead token from a payload we got wrong.
  it("retires the device on invalid-argument only when the token is named", () => {
    expect(
      isInvalidTokenError({
        code: "messaging/invalid-argument",
        message: "The registration token is not a valid FCM registration token",
      }),
    ).toBe(true);
    expect(
      isInvalidTokenError({
        code: "messaging/invalid-argument",
        message: "Invalid JSON payload received",
      }),
    ).toBe(false);
  });

  it.each([
    ["a transient error", { code: "messaging/internal-error" }],
    ["an error without a code", { message: "socket hang up" }],
    ["a response that carries no error at all", undefined],
  ])("keeps the device on %s", (_label, error) => {
    expect(isInvalidTokenError(error)).toBe(false);
  });
});

describe("sendPush", () => {
  const message = {
    title: "Application approved",
    body: "München said yes.",
    data: { href: "/pilot", notificationId: "notif-1" },
  };

  it("sends nothing when the recipient has no device", async () => {
    expect(await sendPush({ ...message, tokens: [] })).toEqual({
      sent: 0,
      invalidTokens: [],
    });
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it("carries the badge, the sound and the href FCM hands back on tap", async () => {
    sendEachForMulticast.mockResolvedValue(respond(ok()));

    await sendPush({ ...message, tokens: ["token-a"], badge: 3 });

    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ["token-a"],
      notification: { title: message.title, body: message.body },
      data: { href: "/pilot", notificationId: "notif-1" },
      apns: { payload: { aps: { sound: "default", badge: 3 } } },
      android: { priority: "high" },
    });
  });

  it("reports the tokens FCM retired next to the ones that went out", async () => {
    sendEachForMulticast.mockResolvedValue(
      respond(ok(), failed("messaging/registration-token-not-registered")),
    );

    expect(
      await sendPush({ ...message, tokens: ["token-a", "token-dead"] }),
    ).toEqual({ sent: 1, invalidTokens: ["token-dead"] });
  });

  // Nothing arrived and the reason was not a dead token: BullMQ has to retry
  // rather than the row claiming a delivery that never happened.
  it("throws when every send failed for a reason that may pass", async () => {
    sendEachForMulticast.mockResolvedValue(
      respond(failed("messaging/internal-error", "backend unavailable")),
    );

    await expect(
      sendPush({ ...message, tokens: ["token-a"] }),
    ).rejects.toMatchObject({ code: "messaging/internal-error" });
  });

  it("returns quietly when every token was simply dead", async () => {
    sendEachForMulticast.mockResolvedValue(
      respond(failed("messaging/invalid-registration-token")),
    );

    expect(await sendPush({ ...message, tokens: ["token-dead"] })).toEqual({
      sent: 0,
      invalidTokens: ["token-dead"],
    });
  });

  // One multicast carries at most 500 tokens; FCM rejects a larger batch.
  it("splits a recipient with more than 500 devices into batches", async () => {
    const tokens = Array.from({ length: 501 }, (_, index) => `token-${index}`);
    sendEachForMulticast.mockImplementation(
      ({ tokens: batch }: { tokens: string[] }) =>
        Promise.resolve(respond(...batch.map(ok))),
    );

    expect(await sendPush({ ...message, tokens })).toEqual({
      sent: 501,
      invalidTokens: [],
    });
    expect(sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(sendEachForMulticast.mock.calls[0][0].tokens).toHaveLength(500);
    expect(sendEachForMulticast.mock.calls[1][0].tokens).toEqual(["token-500"]);
  });
});
