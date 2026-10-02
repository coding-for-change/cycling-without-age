// Helpers for the Tolgee sync workflow (.github/workflows/i18n-sync.yml):
//   changed <ref> <out-dir>   write the texts that differ from <ref>, to push with OVERRIDE
//   removed <ref> [--dry-run] delete from Tolgee the keys that exist at <ref> but no longer here
//   prune                     drop pulled keys the committed en.json doesn't have
// `removed` needs TOLGEE_API_KEY and TOLGEE_PROJECT_ID; TOLGEE_API_URL points it elsewhere.
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = "src/messages";
const TOLGEE_API_URL = process.env.TOLGEE_API_URL ?? "https://app.tolgee.io";

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

function messagesAt(ref) {
  try {
    git("cat-file", "-e", `${ref}^{commit}`);
  } catch {
    throw new Error(`${ref} is not a commit in this checkout.`);
  }
  return new Map(
    git("ls-tree", "-r", "--name-only", ref, "--", ROOT)
      .split("\n")
      .filter((path) => path.endsWith(".json"))
      .map((path) => [path, JSON.parse(git("show", `${ref}:${path}`))]),
  );
}

const messagesOnDisk = () =>
  new Map(
    readdirSync(ROOT).flatMap((namespace) =>
      readdirSync(join(ROOT, namespace))
        .filter((file) => file.endsWith(".json"))
        .map((file) => {
          const path = `${ROOT}/${namespace}/${file}`;
          return [path, JSON.parse(readFileSync(path, "utf8"))];
        }),
    ),
  );

const namespaceOf = (path) => path.split("/")[2];
const englishOf = (path) => `${ROOT}/${namespaceOf(path)}/en.json`;

const keyNames = (node, path = "") =>
  typeof node === "string"
    ? [path]
    : Object.entries(node ?? {}).flatMap(([key, value]) =>
        keyNames(value, path ? `${path}.${key}` : key),
      );

const filterTree = (node, other, keep) => {
  if (typeof node === "string") return keep(node, other) ? node : undefined;
  const entries = Object.entries(node).flatMap(([key, value]) => {
    const kept = filterTree(
      value,
      other && typeof other === "object" && Object.hasOwn(other, key)
        ? other[key]
        : undefined,
      keep,
    );
    return kept === undefined ? [] : [[key, kept]];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
};

function changed(ref, outDir) {
  const before = messagesAt(ref);
  let total = 0;
  for (const [path, now] of messagesOnDisk()) {
    const diff = filterTree(now, before.get(path), (text, old) => text !== old);
    if (!diff) continue;
    const target = join(outDir, relative(ROOT, path));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(diff, null, 2)}\n`);
    total += keyNames(diff).length;
    console.log(`${relative(ROOT, path)}: ${keyNames(diff).length}`);
  }
  console.log(`${total} changed messages`);
}

async function removed(ref, flag) {
  const now = messagesOnDisk();
  const gone = [...messagesAt(ref)]
    .filter(([path]) => path.endsWith("/en.json"))
    .flatMap(([path, before]) =>
      keyNames(
        filterTree(
          before,
          now.get(path),
          (_, text) => typeof text !== "string",
        ),
      ).map((name) => `${namespaceOf(path)}:${name}`),
    );
  gone.forEach((key) => console.log(key));
  console.log(`${gone.length} removed keys`);
  if (!gone.length || flag === "--dry-run") return;

  const { TOLGEE_API_KEY: apiKey, TOLGEE_PROJECT_ID: projectId } = process.env;
  if (!apiKey || !projectId)
    throw new Error("TOLGEE_API_KEY and TOLGEE_PROJECT_ID must be set.");
  const api = async (method, path, body) => {
    const response = await fetch(
      `${TOLGEE_API_URL}/v2/projects/${projectId}${path}`,
      {
        method,
        headers: { "x-api-key": apiKey, "content-type": "application/json" },
        body: body && JSON.stringify(body),
      },
    );
    const text = await response.text();
    if (!response.ok)
      throw new Error(`${method} ${path} failed: ${response.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };

  const wanted = new Set(gone);
  const ids = ((await api("GET", "/all-keys"))?._embedded?.keys ?? [])
    .filter((key) => wanted.has(`${key.namespace ?? ""}:${key.name}`))
    .map((key) => key.id);
  if (!ids.length) return console.log("None of them are in Tolgee.");
  await api("DELETE", "/keys", { ids });
  console.log(`Deleted ${ids.length} keys from Tolgee.`);
}

function prune() {
  const committed = messagesAt("HEAD");
  let total = 0;
  for (const [path, tree] of messagesOnDisk()) {
    const kept = filterTree(
      tree,
      committed.get(englishOf(path)),
      (_, text) => typeof text === "string",
    );
    const dropped = keyNames(tree).length - keyNames(kept).length;
    if (!dropped) continue;
    total += dropped;
    if (kept) writeFileSync(path, `${JSON.stringify(kept, null, 2)}\n`);
    else rmSync(path);
    console.log(`${path}: dropped ${dropped}`);
  }
  console.log(`${total} keys dropped that this branch doesn't have`);
}

const COMMANDS = { changed, removed, prune };
const [command, ...args] = process.argv.slice(2);

Promise.resolve()
  .then(() => {
    if (!Object.hasOwn(COMMANDS, command))
      throw new Error(
        "Usage: node scripts/i18n-sync.mjs changed <ref> <out-dir> | removed <ref> [--dry-run] | prune",
      );
    if (command !== "prune" && !args[0])
      throw new Error(`${command} needs a git ref.`);
    if (command === "changed" && !args[1])
      throw new Error("changed needs an output directory.");
    return COMMANDS[command](...args);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
