import type { Locator, Page } from "@playwright/test";

export async function scrollToBottom(page: Page, wait = 900) {
  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    }),
  );
  await page.waitForTimeout(wait);
}

export async function scrollToTop(page: Page, wait = 700) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(wait);
}

export async function scrollBy(page: Page, y: number, wait = 900) {
  await page.evaluate(
    (dy) => window.scrollBy({ top: dy, behavior: "smooth" }),
    y,
  );
  await page.waitForTimeout(wait);
}

export async function blockExternalLinks(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener(
      "click",
      (e) => {
        const a = (e.target as Element | null)?.closest?.("a");
        if (!a) return;
        const href = a.getAttribute("href") ?? "";
        if (
          (/^(tel:|mailto:|sms:|https?:)/.test(href) &&
            !href.startsWith(location.origin)) ||
          a.target === "_blank"
        )
          e.preventDefault();
      },
      true,
    );
  });
}

export async function waitForSendSlot(seconds = 25) {
  const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8026";
  const until = Date.now() + 90_000;
  while (Date.now() < until) {
    const res = await fetch(`${MAILPIT}/api/v1/messages?limit=10`);
    const { messages } = (await res.json()) as {
      messages: { Created: string }[];
    };
    const recent = messages.filter(
      (m) => Date.now() - new Date(m.Created).getTime() < 62_000,
    );
    const newest = messages[0]
      ? Date.now() - new Date(messages[0].Created).getTime()
      : Infinity;
    if (recent.length < 2 && newest > seconds * 1000) return;
    await new Promise((r) => setTimeout(r, 5000));
  }
}

export async function placeInMunich(page: Page) {
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 48.137, longitude: 11.575 });
}

export async function tickAll(page: Page, scope: Locator, wait = 700) {
  const boxes = scope.getByRole("checkbox");
  const count = await boxes.count();
  for (let i = 0; i < count; i++) {
    const box = boxes.nth(i);
    if (await box.isChecked()) continue;
    await box.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await box.tap();
    await page.waitForTimeout(wait);
  }
}
