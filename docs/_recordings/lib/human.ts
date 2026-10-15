import type { Locator, Page } from "@playwright/test";

const state = new WeakMap<Page, { x: number; y: number }>();

export const pause = (page: Page, ms = 600) => page.waitForTimeout(ms);

export async function moveTo(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error("target has no box");
  const to = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const from = state.get(page) ?? { x: to.x - 200, y: to.y + 120 };
  const steps = Math.max(
    12,
    Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 18),
  );
  await page.mouse.move(from.x, from.y);
  await page.mouse.move(to.x, to.y, { steps });
  state.set(page, to);
}

export async function click(page: Page, target: Locator, wait = 450) {
  await moveTo(page, target);
  await pause(page, 250);
  await target.click();
  await pause(page, wait);
}

export async function tap(page: Page, target: Locator, wait = 450) {
  await target.scrollIntoViewIfNeeded();
  await pause(page, 250);
  await target.tap();
  await pause(page, wait);
}

export async function type(
  page: Page,
  target: Locator,
  text: string,
  delay = 55,
) {
  await target.click();
  await target.pressSequentially(text, { delay });
  await pause(page, 300);
}

export async function humanType(page: Page, target: Locator, text: string) {
  const isMobile = page.viewportSize()!.width < 600;
  if (isMobile) {
    await tap(page, target, 150);
  } else {
    await moveTo(page, target);
  }
  await type(page, target, text);
}

export async function moveToPoint(page: Page, to: { x: number; y: number }) {
  const from = state.get(page) ?? { x: to.x - 200, y: to.y + 120 };
  const steps = Math.max(
    12,
    Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 18),
  );
  await page.mouse.move(from.x, from.y);
  await page.mouse.move(to.x, to.y, { steps });
  state.set(page, to);
}

export async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await moveToPoint(page, from);
  await pause(page, 300);
  await page.mouse.down();
  await pause(page, 150);
  const steps = Math.max(
    20,
    Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 6),
  );
  await page.mouse.move(to.x, to.y, { steps });
  state.set(page, to);
  await pause(page, 300);
  await page.mouse.up();
}
