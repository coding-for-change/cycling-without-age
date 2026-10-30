import { keepNativeAppleRefreshTokenAction } from "@/features/accounts/actions";
import { authClient } from "@/lib/auth-client";
import {
  authorizeWithApple,
  type AppleAuthorization,
} from "@/lib/native/apple-sign-in";

export type AppleSignInOutcome = "signedIn" | "canceled" | "failed";

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

/**
 * The iOS system sheet signs in and better-auth checks its identity token.
 * Apple signs the SHA-256 of the nonce, better-auth gets the raw one.
 */
export async function signInWithApple(): Promise<AppleSignInOutcome> {
  const nonce = crypto.randomUUID();
  let authorization: AppleAuthorization;
  try {
    authorization = await authorizeWithApple(await sha256Hex(nonce));
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    return code === "CANCELED" ? "canceled" : "failed";
  }

  // Apple shares the name only the first time someone signs in to the app.
  const { givenName, familyName } = authorization;
  const { error } = await authClient.signIn.social({
    provider: "apple",
    idToken: {
      token: authorization.identityToken,
      nonce,
      ...(givenName || familyName
        ? { user: { name: { firstName: givenName, lastName: familyName } } }
        : {}),
    },
  });
  if (error) return "failed";

  // Already signed in: without the refresh token only the revoke at account deletion is missing.
  await keepNativeAppleRefreshTokenAction(
    authorization.authorizationCode,
  ).catch(() => {});
  return "signedIn";
}
