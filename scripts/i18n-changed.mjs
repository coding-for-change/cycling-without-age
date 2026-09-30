// Writes the messages that differ from <ref> into <out-dir>, in the same layout as
// src/messages, so the sync job can push exactly the texts a merge changed with
// OVERRIDE. Run: node scripts/i18n-changed.mjs <ref> <out-dir>
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/messages";
const [ref, outDir] = process.argv.slice(2);

if (!ref || !outDir) {
  console.error("Usage: node scripts/i18n-changed.mjs <ref> <out-dir>");
  process.exit(2);
}

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

try {
  git("cat-file", "-e", `${ref}^{commit}`);
} catch {
  console.error(`${ref} is not a commit in this checkout.`);
  process.exit(1);
}

const tracked = new Set(
  git("ls-tree", "-r", "--name-only", ref, "--", ROOT)
    .split("\n")
    .filter(Boolean),
);

const previous = (path) =>
  tracked.has(path) ? JSON.parse(git("show", `${ref}:${path}`)) : {};

const changed = (now, before) => {
  if (typeof now === "string") return now === before ? undefined : now;
  const entries = Object.entries(now).flatMap(([key, value]) => {
    const kept = changed(
      value,
      before && typeof before === "object" ? before[key] : undefined,
    );
    return kept === undefined ? [] : [[key, kept]];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
};

const leaves = (node) =>
  typeof node === "string"
    ? 1
    : Object.values(node).reduce((sum, value) => sum + leaves(value), 0);

let total = 0;

for (const namespace of readdirSync(ROOT)) {
  for (const file of readdirSync(join(ROOT, namespace))) {
    if (!file.endsWith(".json")) continue;
    const path = `${ROOT}/${namespace}/${file}`;
    const diff = changed(
      JSON.parse(readFileSync(path, "utf8")),
      previous(path),
    );
    if (!diff) continue;
    mkdirSync(join(outDir, namespace), { recursive: true });
    writeFileSync(
      join(outDir, namespace, file),
      `${JSON.stringify(diff, null, 2)}\n`,
    );
    const count = leaves(diff);
    total += count;
    console.log(`${namespace}/${file}: ${count}`);
  }
}

console.log(`${total} changed messages`);
