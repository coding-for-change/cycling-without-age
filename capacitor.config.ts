import type { CapacitorConfig } from "@capacitor/cli";


const url = process.env.CAP_SERVER_URL ?? "https://cwa.codingforchange.com";

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
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#92d2c6",
    },
  },
};

export default config;
