// The email mirror must not drift: every colour literal in src/lib/brand.ts has to
// match the token it mirrors in the :root block of src/app/globals.css, which is the
// source of truth (docs/BRAND.md § Colors). Run: npm run check:brand
import { readFileSync } from "node:fs";

const CSS = "src/app/globals.css";
const TS = "src/lib/brand.ts";

// brand.ts key -> the :root custom property it mirrors. A colour literal in
// brand.ts that is absent here fails: add it to globals.css first.
const MIRRORED = {
  canvas: "--canvas",
  canvasDeep: "--canvas-deep",
  ink: "--ink",
  inkSoft: "--ink-soft",
  inkFaint: "--ink-faint",
  line: "--line",
  mint: "--mint",
  mintDeep: "--mint-deep",
  red: "--red",
};

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

const css = stripComments(readFileSync(CSS, "utf8"));
const root = css.slice(
  css.indexOf(":root"),
  css.indexOf("}", css.indexOf(":root")),
);
const tokens = Object.fromEntries(
  [...root.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [
    k,
    v.trim(),
  ]),
);

const hex = (n) => Math.round(n).toString(16).padStart(2, "0");
const channels = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Email clients drop rgba(), so alpha tints are flattened over --canvas in brand.ts.
function resolve(value, name) {
  const literal = value.match(/^#[0-9a-f]{6}$/i);
  if (literal) return value.toLowerCase();

  const rgba = value.match(
    /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)$/i,
  );
  if (!rgba) throw new Error(`${CSS}: cannot read ${name}: ${value}`);
  const [, r, g, b, a] = rgba;
  const over = channels(resolve(tokens["--canvas"], "--canvas"));
  return (
    "#" +
    [r, g, b]
      .map((c, i) => hex(Number(a) * Number(c) + (1 - Number(a)) * over[i]))
      .join("")
  );
}

const literals = [
  ...readFileSync(TS, "utf8").matchAll(/(\w+):\s*"(#[0-9a-fA-F]{6})"/g),
];

const problems = [];
for (const [, key, value] of literals) {
  const token = MIRRORED[key];
  if (!token) {
    problems.push(
      `${TS}: \`${key}\` is not mirrored — add it to ${CSS} :root first`,
    );
    continue;
  }
  if (!tokens[token]) {
    problems.push(
      `${CSS}: \`${token}\` is missing, but ${TS} mirrors it as \`${key}\``,
    );
    continue;
  }
  const expected = resolve(tokens[token], token);
  if (value.toLowerCase() !== expected) {
    problems.push(
      `${TS}: \`${key}\` is ${value.toLowerCase()}, but ${token} is ${expected}`,
    );
  }
}
for (const key of Object.keys(MIRRORED)) {
  if (!literals.some(([, k]) => k === key))
    problems.push(`${TS}: \`${key}\` is gone, but still listed as mirrored`);
}

if (problems.length) {
  console.error(
    `brand tokens drifted:\n${problems.map((p) => `  - ${p}`).join("\n")}`,
  );
  process.exit(1);
}
console.log(`brand tokens ok (${literals.length} colours mirrored)`);
