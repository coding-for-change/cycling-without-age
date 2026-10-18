// node scripts/build-service-worker.mjs
// Runs after `next build`: bundles src/app/sw.ts with the build's precache manifest into
// public/serwist/, so the server only ships finished files and never needs esbuild.
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSerwistRoute } from "@serwist/turbopack";

const OUT_DIR = "public/serwist";

const revision =
  process.env.SENTRY_RELEASE ||
  spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf-8",
  }).stdout?.trim() ||
  "unversioned";

rmSync(OUT_DIR, { recursive: true, force: true });

const serwist = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  globIgnores: [`${OUT_DIR}/**`],
  useNativeEsbuild: true,
});

mkdirSync(OUT_DIR, { recursive: true });
for (const { path } of await serwist.generateStaticParams()) {
  const response = await serwist.GET(new Request("http://localhost"), {
    params: Promise.resolve({ path }),
  });
  writeFileSync(join(OUT_DIR, path), await response.text());
}
