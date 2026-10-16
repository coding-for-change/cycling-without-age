import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["prom-client", "@sentry/core"],
  outputFileTracingExcludes: {
    "*": [
      "decrypted.json",
      "dump.yml",
      "Dockerfile",
      "docs/**/*",
      "docs-internal/**/*",
      "docs-legal/**/*",
      "scripts/**/*",
      "ios/**/*",
      "android/**/*",
      "coverage/**/*",
      "test-results/**/*",
      "playwright-report/**/*",
    ],
  },
  experimental: { authInterrupts: true },
  cacheComponents: true,
  outputFileTracingIncludes: {
    "/legal/*": ["./src/messages/legal/*.md"],
  },
  partialPrefetching: true,
  // Dev-only: the Capacitor WebView loads the dev server by LAN IP, so its
  // Origin is not localhost and /_next/* would be blocked as cross-site. The
  // private ranges mirror `devTrustedOrigins` in src/lib/auth.ts, so nobody
  // has to commit their own address.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  async headers() {
    return [
      {
        source: "/serwist/:path*",
        headers: [{ key: "Service-Worker-Allowed", value: "/" }],
      },
    ];
  },
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
