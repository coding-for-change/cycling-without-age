import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEK_CACHE_MAX = 1000;

export const CURRENT_KEY_VERSION = 1;

let cachedRaw: string | null = null;
let cachedMaster: Buffer | null = null;

const readMasterKey = (): Buffer => {
  const raw = process.env.CHAT_MASTER_KEY?.trim();
  if (!raw)
    throw new Error(
      "CHAT_MASTER_KEY is missing. Generate one with: openssl rand -base64 32",
    );

  if (raw === cachedRaw && cachedMaster) return cachedMaster;

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES)
    throw new Error(
      "CHAT_MASTER_KEY is not base64 of 32 bytes. Generate one with: openssl rand -base64 32",
    );

  cachedRaw = raw;
  cachedMaster = key;
  return key;
};

const masterKey = (keyVersion: number): Buffer => {
  if (keyVersion !== CURRENT_KEY_VERSION)
    throw new Error(`No chat master key for key version ${keyVersion}`);
  return readMasterKey();
};

const seal = (key: Buffer, plaintext: Buffer, aad: string): Buffer => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]);
};

const open = (key: Buffer, payload: Buffer, aad: string): Buffer => {
  if (payload.length < IV_BYTES + TAG_BYTES)
    throw new Error("Chat payload is too short to be authenticated");

  const iv = payload.subarray(0, IV_BYTES);
  const ciphertext = payload.subarray(IV_BYTES, payload.length - TAG_BYTES);
  const tag = payload.subarray(payload.length - TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

export const generateDek = (): Buffer => randomBytes(KEY_BYTES);

export const wrapDek = (
  dek: Buffer,
): { wrapped: Buffer; keyVersion: number } => ({
  wrapped: seal(
    masterKey(CURRENT_KEY_VERSION),
    dek,
    `dek.v${CURRENT_KEY_VERSION}`,
  ),
  keyVersion: CURRENT_KEY_VERSION,
});

export const unwrapDek = (wrapped: Buffer, keyVersion: number): Buffer => {
  const dek = open(masterKey(keyVersion), wrapped, `dek.v${keyVersion}`);
  if (dek.length !== KEY_BYTES)
    throw new Error("Unwrapped chat data key has the wrong length");
  return dek;
};

const dekCache = new Map<string, Buffer>();

export const unwrapDekCached = (
  wrapped: Buffer,
  keyVersion: number,
): Buffer => {
  const cacheKey = `${keyVersion}:${wrapped.toString("hex")}`;
  const hit = dekCache.get(cacheKey);
  if (hit) {
    dekCache.delete(cacheKey);
    dekCache.set(cacheKey, hit);
    return hit;
  }

  const dek = unwrapDek(wrapped, keyVersion);
  dekCache.set(cacheKey, dek);
  if (dekCache.size > DEK_CACHE_MAX) {
    const oldest = dekCache.keys().next().value;
    if (oldest !== undefined) dekCache.delete(oldest);
  }
  return dek;
};

export const encryptText = (dek: Buffer, text: string, aad: string): Buffer =>
  seal(dek, Buffer.from(text, "utf8"), aad);

export const decryptText = (
  dek: Buffer,
  payload: Buffer,
  aad: string,
): string => open(dek, payload, aad).toString("utf8");
