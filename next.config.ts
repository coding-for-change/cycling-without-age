import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["prom-client", "@sentry/core"],
  // The serwist route compiles src/app/sw.ts with native esbuild at request time.
  // esbuild is loaded via a dynamic import nft can't follow, so ship it (plus the
  // packages sw.ts bundles) explicitly or the slim image won't have them.
  outputFileTracingIncludes: {
    "/serwist/[path]": [
      "./src/app/sw.ts",
      "./node_modules/esbuild/**/*",
      "./node_modules/@esbuild/linux-*/**/*",
      "./node_modules/serwist/**/*",
      "./node_modules/@serwist/utils/**/*",
      "./node_modules/idb/**/*",
    ],
  },
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
  partialPrefetching: true,
  // Dev-only: the Capacitor WebView loads the dev server by LAN IP, so its
  // Origin is not localhost and /_next/* would be blocked as cross-site. The
  // private ranges mirror `devTrustedOrigins` in src/lib/auth.ts, so nobody
  // has to commit their own address.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default withSentryConfig(withSerwist(nextConfig), {
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
