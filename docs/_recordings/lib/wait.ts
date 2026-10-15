import fs from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";

export async function settle(page: Page, timeout = 15_000) {
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {});
}

export async function pressUntil(
  page: Page,
  key: string,
  target: Locator,
  tries = 6,
) {
  for (let i = 0; i < tries; i++) {
    await page.keyboard.press(key);
    if (
      await target.waitFor({ timeout: 1500 }).then(
        () => true,
        () => false,
      )
    )
      return;
  }
  throw new Error(`${key} did not reveal target`);
}

export function markStart(slug: string, since: number, lead = 0.1) {
  const dir =
    process.env.DOCS_VIDEO_DIR ?? path.join(__dirname, "..", ".out", "videos");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${slug}.start`),
    String(Math.max(0, (Date.now() - since) / 1000 - lead)),
  );
}

export function markCut(slug: string, since: number) {
  const dir =
    process.env.DOCS_VIDEO_DIR ?? path.join(__dirname, "..", ".out", "videos");
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(
    path.join(dir, `${slug}.cuts`),
    `${(Date.now() - since) / 1000}\n`,
  );
}
