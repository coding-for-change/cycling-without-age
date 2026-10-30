import {
  createHash,
  createPrivateKey,
  sign,
  type KeyObject,
} from "node:crypto";
import { NATIVE_APP } from "@/lib/native-app";
import { logger } from "@/lib/observability/logger";

export const APPLE_ID_URL = "https://appleid.apple.com";

const CLIENT_SECRET_LIFETIME_SECONDS = 5 * 60;

export type AppleCredentials = {
  servicesId: string;
  teamId: string;
  keyId: string;
  privateKey: KeyObject;
};

const pemOf = (value: string) =>
  value.startsWith("-----BEGIN")
    ? value.replaceAll("\\n", "\n")
    : Buffer.from(value, "base64").toString("utf8");

export function readAppleCredentials(
  env: Record<string, string | undefined> = process.env,
): AppleCredentials | null {
  const servicesId = env.APPLE_SERVICES_ID?.trim();
  const keyId = env.APPLE_KEY_ID?.trim();
  const privateKey = env.APPLE_PRIVATE_KEY?.trim();
  if (!servicesId || !keyId || !privateKey) return null;

  try {
    return {
      servicesId,
      teamId: NATIVE_APP.iosTeamId,
      keyId,
      privateKey: createPrivateKey(pemOf(privateKey)),
    };
  } catch {
    // A broken key turns Apple off instead of taking every other sign-in down with it.
    logger.error(
      { event: "auth.apple_key_invalid" },
      "APPLE_PRIVATE_KEY is not a valid key",
    );
    return null;
  }
}

export const appleCredentials = readAppleCredentials();

export const isAppleSignInConfigured = () => appleCredentials !== null;

/** Tokens from the website carry the Services ID, tokens from the iOS app the bundle ID. */
export const appleClientIds = (credentials: AppleCredentials) => [
  credentials.servicesId,
  NATIVE_APP.bundleId,
];

const base64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

/**
 * Apple has no static client secret: every call to its token and revoke
 * endpoints carries a short-lived JWT signed with the Sign in with Apple key.
 * https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
 */
export function appleClientSecret(
  credentials: AppleCredentials,
  clientId: string,
  now = new Date(),
) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const unsigned = [
    base64url({ alg: "ES256", kid: credentials.keyId }),
    base64url({
      iss: credentials.teamId,
      iat: issuedAt,
      exp: issuedAt + CLIENT_SECRET_LIFETIME_SECONDS,
      aud: APPLE_ID_URL,
      sub: clientId,
    }),
  ].join(".");
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: credentials.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${unsigned}.${signature.toString("base64url")}`;
}

export type IdTokenCheck<Context = unknown> = (
  token: string,
  nonce?: string,
  context?: Context,
) => Promise<boolean>;

const sha256Hex = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/**
 * better-auth on its own also lets an identity token through with no nonce, or
 * with the token's own nonce claim sent back, so a leaked token could sign in
 * again. The iOS app sends the raw nonce, which only the device and this
 * server ever see, while Apple signs its SHA-256: only that pair passes.
 */
export const requireRawNonce =
  <Context>(check: IdTokenCheck<Context>): IdTokenCheck<Context> =>
  async (token, nonce, context) =>
    nonce ? check(token, sha256Hex(nonce), context) : false;

/**
 * `checkIdToken` is better-auth's own signature, issuer and audience check,
 * which runs behind `requireRawNonce` for the identity tokens of the iOS app.
 */
export const appleProviderOptions = <Context>(
  credentials: AppleCredentials,
  checkIdToken?: IdTokenCheck<Context>,
) => ({
  clientId: credentials.servicesId,
  // A getter, so every token request signs a fresh short-lived secret.
  get clientSecret() {
    return appleClientSecret(credentials, credentials.servicesId);
  },
  audience: appleClientIds(credentials),
  ...(checkIdToken ? { verifyIdToken: requireRawNonce(checkIdToken) } : {}),
});
