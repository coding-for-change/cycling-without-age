import type { CapacitorConfig } from "@capacitor/cli";

// Evaluated by the Capacitor CLI at `cap sync`/`cap run` time and BAKED into the
// native projects as capacitor.config.json. Re-run `npm run cap:sync` after any
// `cap:*:dev` run to restore the prod URL before a store build.
const url = process.env.CAP_SERVER_URL ?? "https://cwa.codingforchange.com";

const config: CapacitorConfig = {
  appId: "com.codingforchange.cwa",
  appName: "Cycling Without Age",
  webDir: "native/www",
  server: {
    url,
    // Dev-only: allow http for live reload against the local dev server.
    cleartext: url.startsWith("http://"),
    // Local fallback page (relative to webDir) shown when the remote URL fails to load.
    errorPath: "index.html",
  },
  // Lets the server detect the native shell by user agent — isNativePlatform()
  // only exists client-side. Baked in now because config changes later cost a
  // native rebuild + store release.
  appendUserAgent: "CWA-Native",
  plugins: {
    // Splash stays up until the web app hydrates (NativeBootstrap) or the
    // errorPath page hides it. Known ceiling: if the remote HTML loads but its
    // JS bundle fails, the splash hangs — revisit if it happens in practice.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
