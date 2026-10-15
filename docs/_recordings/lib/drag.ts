import type { Locator, Page } from "@playwright/test";
import { moveTo, pause } from "./human";

export async function drag(
  page: Page,
  target: Locator,
  dx: number,
  dy: number,
) {
  await moveTo(page, target);
  const box = (await target.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await pause(page, 250);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 25 });
  await pause(page, 150);
  await page.mouse.up();
}
