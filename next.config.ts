import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { authInterrupts: true },
  cacheComponents: true,
  partialPrefetching: true,
  // Dev-only: the Capacitor WebView loads the dev server by LAN IP, so its
  // Origin is not localhost and /_next/* would be blocked as cross-site.
  allowedDevOrigins: ["192.168.178.86"],
};

export default nextConfig;
