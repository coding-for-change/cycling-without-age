import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["prom-client", "@sentry/core"],
  experimental: { authInterrupts: true },
  cacheComponents: true,
  partialPrefetching: true,
  // Dev-only: the Capacitor WebView loads the dev server by LAN IP, so its
  // Origin is not localhost and /_next/* would be blocked as cross-site. The
  // private ranges mirror `devTrustedOrigins` in src/lib/auth.ts, so nobody
  // has to commit their own address.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  release: {
    name: process.env.SENTRY_RELEASE,
    create: Boolean(process.env.SENTRY_AUTH_TOKEN),
    finalize: false,
  },
  bundleSizeOptimizations: { excludeDebugStatements: true },
  _experimental: { turbopackReactComponentAnnotation: { enabled: true } },
});
