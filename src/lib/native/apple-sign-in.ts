import { Capacitor, registerPlugin } from "@capacitor/core";
import { nativePlatform } from "./platform";

export type AppleAuthorization = {
  identityToken: string;
  authorizationCode: string;
  givenName: string;
  familyName: string;
};

type AppleSignInPlugin = {
  authorize(options: { nonce: string }): Promise<AppleAuthorization>;
};

const PLUGIN = "AppleSignIn";

const AppleSignIn = registerPlugin<AppleSignInPlugin>(PLUGIN);

/**
 * Sign in with Apple is offered only in the iOS app, where App Store guideline
 * 4.8 asks for it next to Google, and only in a build that has the sheet.
 */
export const isAppleSignInAvailable = () =>
  nativePlatform() === "ios" && Capacitor.isPluginAvailable(PLUGIN);

/**
 * Opens the system Sign in with Apple sheet (`AppleSignInPlugin.swift`).
 * `hashedNonce` ends up in the identity token; a dismissed sheet rejects
 * with the code `CANCELED`.
 */
export const authorizeWithApple = (hashedNonce: string) =>
  AppleSignIn.authorize({ nonce: hashedNonce });
