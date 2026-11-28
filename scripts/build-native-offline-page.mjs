import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const SOURCE_DIR = "native/offline-page";
const WEB_DIR = process.env.CAPACITOR_WEB_DIR ?? "native/build";

const GLOBALS_CSS = "src/app/globals.css";
const MESSAGES_DIR = "src/messages/app";
const FALLBACK_LOCALE = "en";
const MESSAGE_NAMESPACE = "nativeOffline";
const TOKENS = [
  "--canvas",
  "--ink",
  "--ink-soft",
  "--mint",
  "--red",
  "--red-hover",
];
const LOGOS = {
  "logo.png": "public/logo.png",
  "logo-dark.png": "docs/logo/logo-dark.png",
};

function fail(problem) {
  console.error(`native offline page: ${problem}`);
  process.exit(1);
}

function appUrlFromCapacitorConfig() {
  const config = process.env.CAPACITOR_CONFIG;
  if (!config)
    fail(
      "CAPACITOR_CONFIG is not set. Run `npx cap sync` or `npx cap copy`, which run this script with it.",
    );
  const url = JSON.parse(config).server?.url;
  if (!url)
    fail(
      "capacitor.config.ts has no server.url, so the page would not know where to reconnect.",
    );
  return new URL(url).href;
}

function messagesByLocale() {
  const locales = readdirSync(MESSAGES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => basename(file, ".json"));
  const messages = Object.fromEntries(
    locales.map((locale) => {
      const all = JSON.parse(
        readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf8"),
      );
      if (!all[MESSAGE_NAMESPACE])
        fail(
          `${MESSAGES_DIR}/${locale}.json has no "${MESSAGE_NAMESPACE}" messages.`,
        );
      return [locale, all[MESSAGE_NAMESPACE]];
    }),
  );
  if (!messages[FALLBACK_LOCALE])
    fail(`${MESSAGES_DIR}/${FALLBACK_LOCALE}.json is missing.`);
  return messages;
}

function customProperties(css, selector) {
  const start = css.indexOf(`\n${selector} {`);
  if (start === -1) fail(`${GLOBALS_CSS} has no \`${selector}\` block.`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
}

function declarations(properties, indent) {
  return TOKENS.filter((token) => properties[token])
    .map((token) => `${indent}${token}: ${properties[token]};`)
    .join("\n");
}

function tokensCss() {
  const css = readFileSync(GLOBALS_CSS, "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const light = customProperties(css, ":root");
  const dark = customProperties(css, ".dark");
  const missing = TOKENS.filter((token) => !light[token]);
  if (missing.length)
    fail(`${GLOBALS_CSS} :root no longer defines ${missing.join(", ")}.`);

  return [
    ":root {",
    declarations(light, "  "),
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    "  :root {",
    declarations(dark, "    "),
    "  }",
    "}",
  ].join("\n");
}

function offlineConfigJs(appUrl) {
  const config = {
    appUrl,
    fallbackLocale: FALLBACK_LOCALE,
    messages: messagesByLocale(),
  };
  const json = JSON.stringify(config, null, 2).replaceAll("<", "\\u003c");
  return `window.CWA_OFFLINE_PAGE = ${json};`;
}

function pngDataUrl(path) {
  return `data:image/png;base64,${readFileSync(path).toString("base64")}`;
}

function readSource(name) {
  return readFileSync(join(SOURCE_DIR, name), "utf8").trim();
}

function inlineEverything(html, files) {
  const contentOf = (name) => {
    if (!(name in files))
      fail(`${SOURCE_DIR}/index.html refers to "${name}", which is not built.`);
    return files[name];
  };
  return html
    .replace(
      /<link rel="stylesheet" href="([^"]+)" \/>/g,
      (_, name) => `<style>\n${contentOf(name)}\n</style>`,
    )
    .replace(
      /<script src="([^"]+)"><\/script>/g,
      (_, name) => `<script>\n${contentOf(name)}\n</script>`,
    )
    .replace(
      /(src|srcset)="([^"]+\.png)"/g,
      (_, attribute, name) => `${attribute}="${contentOf(name)}"`,
    );
}

const appUrl = appUrlFromCapacitorConfig();

const files = {
  "tokens.css": tokensCss(),
  "offline.css": readSource("offline.css"),
  "offline-config.js": offlineConfigJs(appUrl),
  "offline.js": readSource("offline.js"),
  ...Object.fromEntries(
    Object.entries(LOGOS).map(([name, path]) => [name, pngDataUrl(path)]),
  ),
};

mkdirSync(WEB_DIR, { recursive: true });
writeFileSync(
  join(WEB_DIR, "index.html"),
  inlineEverything(readSource("index.html"), files) + "\n",
);

console.log(`native offline page: built for ${appUrl}`);
