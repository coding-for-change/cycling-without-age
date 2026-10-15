import { test as base, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { ACCOUNTS, statePath, type Account } from "./accounts";
import { installCursor } from "./cursor";

export const VIDEO_DIR =
  process.env.DOCS_VIDEO_DIR ?? path.join(__dirname, "..", ".out", "videos");

type Recorder = (opts: {
  slug: string;
  account: Account | null;
  warm?: string[];
}) => Promise<Page>;

export const test = base.extend<{ record: Recorder }>({
  record: async (
    {
      browser,
      viewport,
      deviceScaleFactor,
      isMobile,
      hasTouch,
      userAgent,
      baseURL,
      locale,
      timezoneId,
    },
    use,
  ) => {
    const opened: { page: Page; slug: string }[] = [];
    const contextOptions = {
      viewport,
      deviceScaleFactor,
      isMobile,
      hasTouch,
      userAgent,
      baseURL,
      locale,
      timezoneId,
      colorScheme: "light" as const,
    };
    await use(async ({ slug, account, warm = [] }) => {
      const storageState = account ? statePath(account) : undefined;
      if (warm.length) {
        const warmContext = await browser.newContext({
          ...contextOptions,
          storageState,
        });
        const warmPage = await warmContext.newPage();
        for (const url of warm) {
          await warmPage.goto(url);
          await warmPage
            .waitForLoadState("networkidle", { timeout: 10_000 })
            .catch(() => {});
        }
        await warmContext.close();
      }
      const size = { width: viewport!.width, height: viewport!.height };
      const context = await browser.newContext({
        ...contextOptions,
        storageState,
        recordVideo: { dir: path.join(VIDEO_DIR, "raw"), size },
      });
      await installCursor(context);
      const page = await context.newPage();
      opened.push({ page, slug });
      return page;
    });
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
    for (const { page, slug } of opened) {
      const video = page.video();
      await page.waitForTimeout(800);
      await page.context().close();
      if (video) {
        const target = path.join(VIDEO_DIR, `${slug}.webm`);
        await video.saveAs(target);
        await video.delete();
      }
    }
  },
});

export { expect } from "@playwright/test";
export { ACCOUNTS };
