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

// The awaited value must be the module, never the plugin proxy: its `then` reads as a thenable.
const plugin = () => import("@capgo/capacitor-passkey");

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
