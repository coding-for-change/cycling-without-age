import {
  CURRENT_KEY_VERSION,
  decryptText,
  encryptText,
  generateDek,
  unwrapDek,
  unwrapDekCached,
  wrapDek,
} from "@/lib/crypto/chat-cipher";

const masterKey = (fill: number) => Buffer.alloc(32, fill).toString("base64");
const before = process.env.CHAT_MASTER_KEY;

beforeEach(() => {
  process.env.CHAT_MASTER_KEY = masterKey(1);
});

afterAll(() => {
  process.env.CHAT_MASTER_KEY = before;
});

describe("message encryption", () => {
  it("returns the markdown a pilot typed, emoji and all", () => {
    const dek = generateDek();
    const text = "Meet at the **park** at 14:00 🚲";
    expect(decryptText(dek, encryptText(dek, text, "conv-1"), "conv-1")).toBe(
      text,
    );
  });

  it("uses a fresh iv per call, so the same text never repeats itself", () => {
    const dek = generateDek();
    const first = encryptText(dek, "See you Saturday", "conv-1");
    const second = encryptText(dek, "See you Saturday", "conv-1");

    expect(first.subarray(0, 12).equals(second.subarray(0, 12))).toBe(false);
    expect(first.equals(second)).toBe(false);
  });

  it("refuses a payload whose ciphertext was altered", () => {
    const dek = generateDek();
    const payload = encryptText(dek, "See you Saturday", "conv-1");
    payload[14] ^= 0xff;

    expect(() => decryptText(dek, payload, "conv-1")).toThrow();
  });

  it("refuses a payload whose tag was altered", () => {
    const dek = generateDek();
    const payload = encryptText(dek, "See you Saturday", "conv-1");
    payload[payload.length - 1] ^= 0xff;

    expect(() => decryptText(dek, payload, "conv-1")).toThrow();
  });

  it("refuses a message replayed into another conversation", () => {
    const dek = generateDek();
    const payload = encryptText(dek, "See you Saturday", "conv-1");

    expect(() => decryptText(dek, payload, "conv-2")).toThrow();
  });

  it("refuses a payload shorter than an iv and a tag", () => {
    const dek = generateDek();

    expect(() => decryptText(dek, Buffer.alloc(8), "conv-1")).toThrow(
      /too short/,
    );
  });

  it("refuses another conversation's key", () => {
    const payload = encryptText(generateDek(), "See you Saturday", "conv-1");

    expect(() => decryptText(generateDek(), payload, "conv-1")).toThrow();
  });
});

describe("data key envelopes", () => {
  it("unwraps to the key it wrapped and fits the dek column", () => {
    const dek = generateDek();
    const { wrapped, keyVersion } = wrapDek(dek);

    expect(keyVersion).toBe(CURRENT_KEY_VERSION);
    expect(wrapped.length).toBeLessThanOrEqual(80);
    expect(unwrapDek(wrapped, keyVersion).equals(dek)).toBe(true);
  });

  it("refuses a key version it has no master key for", () => {
    const { wrapped } = wrapDek(generateDek());

    expect(() => unwrapDek(wrapped, 2)).toThrow(/key version 2/);
  });

  it("refuses a wrapped key that was altered", () => {
    const { wrapped, keyVersion } = wrapDek(generateDek());
    wrapped[20] ^= 0xff;

    expect(() => unwrapDek(wrapped, keyVersion)).toThrow();
  });

  it("refuses a wrapped key made under a different master key", () => {
    const { wrapped, keyVersion } = wrapDek(generateDek());
    process.env.CHAT_MASTER_KEY = masterKey(2);

    expect(() => unwrapDek(wrapped, keyVersion)).toThrow();
  });

  it("caches the unwrapped key and still returns the same bytes", () => {
    const dek = generateDek();
    const { wrapped, keyVersion } = wrapDek(dek);

    const first = unwrapDekCached(wrapped, keyVersion);
    const second = unwrapDekCached(wrapped, keyVersion);

    expect(first.equals(dek)).toBe(true);
    expect(second).toBe(first);
  });
});

describe("master key", () => {
  it("says how to generate one when it is missing", () => {
    delete process.env.CHAT_MASTER_KEY;

    expect(() => wrapDek(generateDek())).toThrow(
      /CHAT_MASTER_KEY is missing\. Generate one with: openssl rand -base64 32/,
    );
  });

  it("says how to generate one when it is not 32 bytes", () => {
    process.env.CHAT_MASTER_KEY = Buffer.alloc(16, 3).toString("base64");

    expect(() => wrapDek(generateDek())).toThrow(
      /not base64 of 32 bytes\. Generate one with: openssl rand -base64 32/,
    );
  });
});
