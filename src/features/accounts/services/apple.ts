import {
  APPLE_ID_URL,
  appleClientSecret,
  type AppleCredentials,
} from "@/lib/apple";
import { prisma } from "@/lib/prisma";

const APPLE_TIMEOUT_MS = 10_000;

export const findAppleAccounts = (userId: string) =>
  prisma.account.findMany({
    where: { userId, providerId: "apple" },
    select: { id: true, accountId: true, refreshToken: true },
  });

export const saveAppleRefreshToken = (
  accountId: string,
  refreshToken: string,
) =>
  prisma.account.update({ where: { id: accountId }, data: { refreshToken } });

const postToApple = (
  path: "/auth/token" | "/auth/revoke",
  credentials: AppleCredentials,
  clientId: string,
  params: Record<string, string>,
) =>
  fetch(`${APPLE_ID_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: appleClientSecret(credentials, clientId),
      ...params,
    }),
    signal: AbortSignal.timeout(APPLE_TIMEOUT_MS),
  });

// The id token comes straight from Apple over TLS, so its subject is read without verifying it again.
const subjectOf = (idToken: string): unknown =>
  JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString())
    .sub;

export async function exchangeAppleCode(
  credentials: AppleCredentials,
  clientId: string,
  code: string,
) {
  const response = await postToApple("/auth/token", credentials, clientId, {
    code,
    grant_type: "authorization_code",
  });
  if (!response.ok)
    throw new Error(`Apple token exchange failed with ${response.status}`);
  const body = (await response.json()) as {
    refresh_token?: string;
    id_token?: string;
  };
  if (!body.refresh_token || !body.id_token)
    throw new Error("Apple token exchange returned no refresh or id token");
  return {
    refreshToken: body.refresh_token,
    subject: subjectOf(body.id_token),
  };
}

export async function revokeAppleToken(
  credentials: AppleCredentials,
  clientId: string,
  refreshToken: string,
) {
  const response = await postToApple("/auth/revoke", credentials, clientId, {
    token: refreshToken,
    token_type_hint: "refresh_token",
  });
  if (!response.ok)
    throw new Error(`Apple token revocation failed with ${response.status}`);
}
