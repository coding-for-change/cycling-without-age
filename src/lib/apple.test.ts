import { createHash, generateKeyPairSync, verify } from "node:crypto";
import {
  appleClientSecret,
  appleProviderOptions,
  readAppleCredentials,
  requireRawNonce,
} from "./apple";

jest.mock("@/lib/observability/logger", () => ({
  logger: { error: jest.fn() },
}));

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});
const pem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();

const env = {
  APPLE_SERVICES_ID: "com.codingforchange.cwa.web",
  APPLE_KEY_ID: "KEY123",
  APPLE_PRIVATE_KEY: pem,
};

const decode = (part: string) =>
  JSON.parse(Buffer.from(part, "base64url").toString());

describe("Apple credentials", () => {
  it("stay off while any of them is missing", () => {
    expect(readAppleCredentials({ ...env, APPLE_KEY_ID: "" })).toBeNull();
  });

  it("read the key as PEM, with escaped newlines or base64 encoded", () => {
    const escaped = pem.replaceAll("\n", "\\n");
    const base64 = Buffer.from(pem).toString("base64");

    for (const key of [pem, escaped, base64])
      expect(
        readAppleCredentials({ ...env, APPLE_PRIVATE_KEY: key }),
      ).not.toBeNull();
  });

  it("stay off when the key is broken, so other sign-ins keep working", () => {
    expect(
      readAppleCredentials({ ...env, APPLE_PRIVATE_KEY: "not a key" }),
    ).toBeNull();
  });
});

describe("the Apple client secret", () => {
  const credentials = readAppleCredentials(env)!;
  const now = new Date("2026-10-29T12:00:00Z");
  const secret = appleClientSecret(credentials, "com.codingforchange.cwa", now);
  const [header, payload, signature] = secret.split(".");

  it("is an ES256 JWT for the given client, valid for five minutes", () => {
    expect(decode(header)).toEqual({ alg: "ES256", kid: "KEY123" });
    expect(decode(payload)).toEqual({
      iss: "8TPMU6R9FN",
      iat: 1793275200,
      exp: 1793275500,
      aud: "https://appleid.apple.com",
      sub: "com.codingforchange.cwa",
    });
  });

  it("is signed with the Sign in with Apple key", () => {
    const valid = verify(
      "sha256",
      Buffer.from(`${header}.${payload}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url"),
    );
    expect(valid).toBe(true);
  });
});

describe("identity tokens from the iOS app", () => {
  const check = jest.fn(async () => true);
  const verifyIdToken = requireRawNonce(check);

  beforeEach(() => check.mockClear());

  it("are checked against the SHA-256 of the raw nonce, which Apple signed", async () => {
    await expect(verifyIdToken("token", "raw-nonce", "ctx")).resolves.toBe(
      true,
    );
    expect(check).toHaveBeenCalledWith(
      "token",
      createHash("sha256").update("raw-nonce").digest("hex"),
      "ctx",
    );
  });

  it("are refused without a nonce, so a leaked token cannot be replayed", async () => {
    await expect(verifyIdToken("token", undefined)).resolves.toBe(false);
    await expect(verifyIdToken("token", "")).resolves.toBe(false);
    expect(check).not.toHaveBeenCalled();
  });

  it("are refused when better-auth's own check fails", async () => {
    check.mockResolvedValueOnce(false);
    await expect(verifyIdToken("token", "raw-nonce")).resolves.toBe(false);
  });
});

describe("the Apple provider options", () => {
  const credentials = readAppleCredentials(env)!;

  it("sign a new client secret every time it is read", () => {
    jest.useFakeTimers({ now: new Date("2026-10-29T12:00:00Z") });
    const options = appleProviderOptions(credentials);
    const first = options.clientSecret;
    jest.setSystemTime(new Date("2026-10-29T12:10:00Z"));
    expect(options.clientSecret).not.toBe(first);
    jest.useRealTimers();
  });

  it("accept identity tokens for the website and the iOS app", () => {
    expect(appleProviderOptions(credentials).audience).toEqual([
      "com.codingforchange.cwa.web",
      "com.codingforchange.cwa",
    ]);
  });

  it("only replace better-auth's token check when given one", () => {
    expect(appleProviderOptions(credentials)).not.toHaveProperty(
      "verifyIdToken",
    );
    expect(appleProviderOptions(credentials, async () => true)).toHaveProperty(
      "verifyIdToken",
    );
  });
});
