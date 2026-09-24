import {
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * A calendar feed address is `<key>.<signature>`. The key is random and stored;
 * the signature is an HMAC of it under a subkey of `BETTER_AUTH_SECRET`, and is
 * stored nowhere. Reading the `calendar_feed` table therefore opens no feed,
 * yet the address can be shown again at any time without keeping it in the
 * clear. Rotating `BETTER_AUTH_SECRET` retires every address at once.
 */

const KEY_BYTES = 16;
const SIGNATURE_BYTES = 16;
const SUBKEY_INFO = "cwa.calendar-feed.v1";
const PART = "[A-Za-z0-9_-]{22}";
const TOKEN = new RegExp(`^(${PART})\\.(${PART})$`);

let cachedSecret: string | null = null;
let cachedSubkey: Buffer | null = null;

const subkey = (): Buffer => {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret)
    throw new Error(
      "BETTER_AUTH_SECRET is missing — calendar feed addresses cannot be signed",
    );
  if (secret === cachedSecret && cachedSubkey) return cachedSubkey;

  cachedSubkey = Buffer.from(hkdfSync("sha256", secret, "", SUBKEY_INFO, 32));
  cachedSecret = secret;
  return cachedSubkey;
};

const signatureOf = (key: string) =>
  createHmac("sha256", subkey())
    .update(key)
    .digest()
    .subarray(0, SIGNATURE_BYTES)
    .toString("base64url");

export const newFeedKey = () => randomBytes(KEY_BYTES).toString("base64url");

export const feedToken = (key: string) => `${key}.${signatureOf(key)}`;

/** The key a token was signed for, or `null` — never a reason. */
export function verifyFeedToken(token: string): string | null {
  const match = TOKEN.exec(token);
  if (!match) return null;
  const [, key, signature] = match;
  const expected = Buffer.from(signatureOf(key));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected)
    ? key
    : null;
}
