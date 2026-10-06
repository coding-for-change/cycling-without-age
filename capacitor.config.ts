import type { CapacitorConfig } from "@capacitor/cli";
import type { KeyboardResize } from "@capacitor/keyboard";

const PRODUCTION_URL = "https://cwa.codingforchange.com";
const url = process.env.CAP_SERVER_URL ?? PRODUCTION_URL;

const config: CapacitorConfig = {
  appId: "com.codingforchange.cwa",
  appName: "Cycling Without Age",
  webDir: "native/www",
  server: {
    url,
    cleartext: url.startsWith("http://"),
    errorPath: "index.html",
  },
  // Lets the server detect the native shell by user agent — isNativePlatform()
  // only exists client-side. Baked in now because config changes later cost a
  // native rebuild + store release.
  appendUserAgent: "CWA-Native",
  backgroundColor: "#ffffff",
  ios: {
    limitsNavigationsToAppBoundDomains: url === PRODUCTION_URL,
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#92d2c6",
    },
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      resize: "none" as KeyboardResize,
      resizeOnFullScreen: true,
    },
    // The associated-domains entitlement and the Android asset statement are
    // committed by hand, so the plugin's cap-sync hook stays off.
    CapacitorPasskey: { autoShim: false },
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/messaging": { symlink: true },
        },
      },
    },
  },
};

export default config;
