import { feedToken, newFeedKey, verifyFeedToken } from "./feed-signature";

const ORIGINAL = process.env.BETTER_AUTH_SECRET;

beforeEach(() => {
  process.env.BETTER_AUTH_SECRET = "test-secret-one";
});

afterAll(() => {
  process.env.BETTER_AUTH_SECRET = ORIGINAL;
});

describe("feed tokens", () => {
  it("mints 128-bit url-safe keys", () => {
    const key = newFeedKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newFeedKey()).not.toBe(key);
  });

  it("verifies its own token back to the key", () => {
    const key = newFeedKey();
    expect(verifyFeedToken(feedToken(key))).toBe(key);
  });

  it("is deterministic, so the address can be shown again", () => {
    const key = newFeedKey();
    expect(feedToken(key)).toBe(feedToken(key));
  });

  it("rejects a key with someone else's signature", () => {
    const [, signature] = feedToken(newFeedKey()).split(".");
    expect(verifyFeedToken(`${newFeedKey()}.${signature}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const key = newFeedKey();
    const token = feedToken(key);
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyFeedToken(flipped)).toBeNull();
  });

  it("rejects a key alone and malformed input", () => {
    const key = newFeedKey();
    expect(verifyFeedToken(key)).toBeNull();
    expect(verifyFeedToken(`${key}.`)).toBeNull();
    expect(verifyFeedToken(`${feedToken(key)}.ics`)).toBeNull();
    expect(verifyFeedToken(`../${feedToken(key)}`)).toBeNull();
    expect(verifyFeedToken("")).toBeNull();
  });

  it("stops verifying once the server secret changes", () => {
    const key = newFeedKey();
    const token = feedToken(key);
    process.env.BETTER_AUTH_SECRET = "test-secret-two";
    expect(verifyFeedToken(token)).toBeNull();
  });

  it("refuses to sign without a secret", () => {
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => feedToken(newFeedKey())).toThrow(/BETTER_AUTH_SECRET/);
  });
});
