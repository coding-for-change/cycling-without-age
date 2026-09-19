import { authClient } from "@/lib/auth-client";
import {
  createNativePasskey,
  getNativePasskey,
  isNative,
  type PasskeyCreationOptions,
  type PasskeyCredential,
  type PasskeyRequestOptions,
} from "@/lib/native/passkey";

export type PasskeyFailure = { code: string; message: string };
export type PasskeyResult = { error: PasskeyFailure | null };

type FetchError = { code?: string; message?: string } | null | undefined;

const failureOf = (error: FetchError): PasskeyFailure | null =>
  error
    ? { code: error.code ?? "UNKNOWN_ERROR", message: error.message ?? "" }
    : null;

// A rejected plugin call carries the WebAuthn error name as its Capacitor code.
const nativeFailure = (error: unknown): PasskeyFailure => ({
  code: (error as { code?: string } | null)?.code ?? "UNKNOWN_ERROR",
  message: error instanceof Error ? error.message : String(error),
});

// better-auth strips clientExtensionResults before posting; mirror it.
const credentialBody = (credential: PasskeyCredential) => ({
  id: credential.id,
  rawId: credential.rawId,
  type: credential.type,
  ...(credential.authenticatorAttachment
    ? { authenticatorAttachment: credential.authenticatorAttachment }
    : {}),
  response: credential.response,
});

export async function addPasskey({
  name,
}: {
  name?: string;
}): Promise<PasskeyResult> {
  if (!isNative()) {
    const result = await authClient.passkey.addPasskey({ name });
    return { error: failureOf(result?.error) };
  }

  const options = await authClient.$fetch<PasskeyCreationOptions>(
    "/passkey/generate-register-options",
    { method: "GET", query: name ? { name } : undefined, throw: false },
  );
  if (!options.data) return { error: failureOf(options.error) };

  let credential: PasskeyCredential;
  try {
    credential = await createNativePasskey(
      options.data,
      window.location.origin,
    );
  } catch (error) {
    return { error: nativeFailure(error) };
  }

  const verified = await authClient.$fetch<{ id: string }>(
    "/passkey/verify-registration",
    {
      method: "POST",
      body: { response: credentialBody(credential), name },
      throw: false,
    },
  );
  if (!verified.data) return { error: failureOf(verified.error) };

  authClient.$store.notify("$listPasskeys");
  return { error: null };
}

export async function signInWithPasskey(): Promise<PasskeyResult> {
  if (!isNative()) {
    const result = await authClient.signIn.passkey();
    return { error: failureOf(result?.error) };
  }

  const options = await authClient.$fetch<PasskeyRequestOptions>(
    "/passkey/generate-authenticate-options",
    { method: "GET", throw: false },
  );
  if (!options.data) return { error: failureOf(options.error) };

  let credential: PasskeyCredential;
  try {
    credential = await getNativePasskey(options.data, window.location.origin);
  } catch (error) {
    return { error: nativeFailure(error) };
  }

  const verified = await authClient.$fetch<{ session: unknown }>(
    "/passkey/verify-authentication",
    {
      method: "POST",
      body: { response: credentialBody(credential) },
      throw: false,
    },
  );
  if (!verified.data) return { error: failureOf(verified.error) };

  authClient.$store.notify("$sessionSignal");
  return { error: null };
}
