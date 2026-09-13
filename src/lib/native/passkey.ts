import type {
  PasskeyAuthenticationCredential,
  PasskeyPublicKeyCredentialCreationOptionsJSON,
  PasskeyPublicKeyCredentialRequestOptionsJSON,
  PasskeyRegistrationCredential,
} from "@capgo/capacitor-passkey";

export { isNative } from "./platform";

export type PasskeyCreationOptions = PasskeyPublicKeyCredentialCreationOptionsJSON;
export type PasskeyRequestOptions = PasskeyPublicKeyCredentialRequestOptionsJSON;
export type PasskeyCredential =
  | PasskeyRegistrationCredential
  | PasskeyAuthenticationCredential;

// Resolves to the module, never to the plugin proxy: see push.ts for why a
// Capacitor plugin must not be the value of an awaited promise.
const plugin = () => import("@capgo/capacitor-passkey");

/**
 * The shell's WKWebView has no WebAuthn, so the ceremony runs through the OS
 * passkey APIs. `origin` is the site the relying party expects to see in
 * clientDataJSON; iOS 17.4+ encodes it, older versions report the rpId.
 */
export const createNativePasskey = async (
  publicKey: PasskeyCreationOptions,
  origin: string,
): Promise<PasskeyRegistrationCredential> =>
  (await plugin()).CapacitorPasskey.createCredential({ publicKey, origin });

export const getNativePasskey = async (
  publicKey: PasskeyRequestOptions,
  origin: string,
): Promise<PasskeyAuthenticationCredential> =>
  (await plugin()).CapacitorPasskey.getCredential({ publicKey, origin });
