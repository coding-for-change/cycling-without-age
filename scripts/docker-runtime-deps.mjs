// node scripts/docker-runtime-deps.mjs <out> <entry>...
// Merges into <out>/node_modules the packages the given bundles require at runtime, so the
// image ships Next's traced standalone node_modules plus the worker's and seed's, never the
// full install. Prebuilt binaries for other platforms are dropped on the way.
import { cpSync, globSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join } from "node:path";

const { nodeFileTrace } = createRequire(import.meta.url)(
  "next/dist/compiled/@vercel/nft",
);

const [out, ...entries] = process.argv.slice(2);
const base = process.cwd();
const nodeModules = join(out, "node_modules");

const { fileList } = await nodeFileTrace(entries, { base });
for (const file of fileList) {
  if (file.startsWith("node_modules/")) {
    cpSync(join(base, file), join(out, file), { verbatimSymlinks: true });
  }
}

for (const dir of globSync(
  "@img/sharp-{wasm32,linuxmusl-*,libvips-linuxmusl-*}",
  {
    cwd: nodeModules,
  },
)) {
  rmSync(join(nodeModules, dir), { recursive: true, force: true });
}

for (const file of globSync("**/*.{map,d.ts,d.mts,d.cts}", {
  cwd: nodeModules,
})) {
  rmSync(join(nodeModules, file));
}

const otherOs = /darwin|win32|freebsd|musl|android/;
const anyLinux = /linux-(x64|arm64|arm|ia32)/;
for (const file of globSync("**/*.node", { cwd: nodeModules })) {
  const name = basename(file);
  const otherArch =
    anyLinux.test(name) && !name.includes(`linux-${process.arch}`);
  if (otherOs.test(name) || otherArch) rmSync(join(nodeModules, file));
}
